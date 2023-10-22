import UserManager, { AccessTypes } from "./UserManager.js";
import {tmpdir} from "os";
import fs from "fs/promises";
import path from "path";

import {expect} from "chai";
import { BadRequestError, NotFoundError, UnauthorizedError } from "../utils/errors.js";
import User from "./User.js";
import openDatabase from "../vfs/helpers/db.js";
import { Uid } from "../utils/uid.js";

describe("UserManager static methods", function(){
  describe("parsePassword()", function(){
    it("parse a password string", function(){
      let values = UserManager.parsePassword(`$scrypt$N=16$r=8$p=1$p22AX$M3o9ww`);
      expect(values).to.have.property("algo", "scrypt");
      expect(values).to.have.property("params").deep.equal({N:16, r: 8, p: 1});
      expect(values).to.have.property("salt", "p22AX");
      expect(values).to.have.property("hash", "M3o9ww");
    });
    it("throws an error for malformed passwords", function(){
      expect(()=>UserManager.parsePassword("xx")).to.throw("Malformed");
    });
  });

  describe("formatPassword()", function(){
    it("can be parsed", async function(){
      let str = await UserManager.formatPassword("foo")
      expect(str).to.match(/^[a-zA-Z0-9$+=_-]+$/);
      let values = UserManager.parsePassword(str as string);
      expect(values).to.have.property("salt");
    });
  });
  describe("verifyPassword()", function(){
    it("matches same password", async function(){
      expect(await UserManager.verifyPassword(
        "foo", 
        "$scrypt$N=16$r=2$p=1$salt$LujVzsDpII5VRQoJQw_Qjw",
      )).to.be.true;
    });
    it("rejects different passwords", async function(){
      expect(UserManager.verifyPassword(
        "foo", 
        "$scrypt$N=16$r=2$p=1$968q$43NSmFr",
      )).to.eventually.be.false;
    });
    it("bubbles errors from parsePassword", function(){
      expect(UserManager.verifyPassword(
        "foo", 
        "xx",
      )).to.be.rejectedWith("Malformed");
    });
  });

  describe("isValid", function(){
    let tests :Record<keyof typeof UserManager.isValid, [string, boolean][]> = {
      username:[
        ["foo", true],
        ["x", false],
        ["foo@example.com", false]
      ],
      password:[
        ["12345678", true]
      ],
      email:[
        ["foo@example.com", true],
      ]
    };
    for(let key of Object.keys(tests) as [keyof typeof UserManager.isValid]){
      let values = (tests as any)[key] as [string, boolean][];
      for(let [value, res] of values){
        it(`${key}(${value}) => ${res}`, function(){
          expect(UserManager.isValid[key](value)).to.equal(res);
        });
      }
    }
    it("tests every keys", function(){
      expect(Object.keys(UserManager.isValid).sort()).to.deep.equal((Object.keys(tests).sort()));
    });

  })
});

describe("UserManager methods", function(){
  let userManager :UserManager;
  this.beforeEach(async function(){
    this.db = await openDatabase({filename:":memory:", forceMigration:true});
    userManager = new UserManager(this.db);
  });
  describe("open()", function(){
    it("creates users.index if it doesn't exist", async function(){
      await expect(UserManager.open({filename:":memory:", forceMigration:true})).to.be.fulfilled;
    })
  });

  describe("addUser()", function(){
    it("creates a user", async function(){
      let user = await expect(userManager.addUser("foo", "abcdefghij")).to.be.fulfilled;
      expect(user).to.have.property("username", "foo");
      let users = await userManager.getUsers();
      expect(users).to.have.length(1);
      expect(users[0]).to.have.property("username", "foo");
      expect(await userManager.getUserByName("foo")).to.be.ok;
    });
    [
      "../something",
      "/foo",
      "foo;bar",
      "foo:bar"
    ].forEach(username=>{
      it(`rejects invalid username "${username}"`, async function(){
        await expect(userManager.addUser(username, "abcdefghij")).to.be.rejectedWith("Invalid username");
      });
    });

    it("rejects duplicate username", async function(){
      await expect(userManager.addUser("bob", "abcdefghij")).to.be.fulfilled;
      await expect(userManager.addUser("bob", "abcdefghij")).to.be.rejectedWith("UNIQUE constraint failed");
    })

    it("can handle RNG duplicates", async function(){
      let old = Uid.make;
      try{
        let u =  await expect(userManager.addUser("bob", "abcdefghij")).to.be.fulfilled;
        let err = await expect(userManager.write(u)).to.be.rejectedWith("UNIQUE constraint failed");
        expect(err).to.have.property("code", "SQLITE_CONSTRAINT");
      }finally{
        Uid.make = old;
      }
    });
  });

  describe("removeUser()", function(){
    it("remove a user", async function(){
      let u = await userManager.addUser("bob", "abcdefghij");
      expect(await userManager.getUsers()).to.have.property("length", 1);
      await userManager.removeUser(u.uid);
      expect(await userManager.getUsers()).to.have.property("length", 0);
    });
    it("expects a valid uid", async function(){
      await expect(userManager.removeUser(10)).to.be.rejectedWith("404");
    });
  })

  describe("patchUser", function(){
    let u:User;
    this.beforeEach(async function(){
      u = await userManager.addUser("bob", "abcdefghij");
    });
    [
      ["email", "foo@example.com"],
      ["username", "bar"],
      ["isAdministrator", true],
    ].forEach(([key, value])=>{
      it(`can change a ${key}`, async function(){
        let updated = await userManager.patchUser(u.uid, {[key as string]: value});
        expect(updated).to.have.property(key as string, value);
        expect(updated).to.deep.equal({
          ...u,
          [key as string]: value,
        })
      });
    });
    it("rejects invalid values", async function(){
      await expect(userManager.patchUser(u.uid, {username:"x"})).to.be.rejectedWith(BadRequestError);
    })
    it("rejects invalid properties", async function(){
      await expect(userManager.patchUser(u.uid, {foo:"bar"} as any)).to.be.rejectedWith(BadRequestError);
    })
    it("throw 404 if user doesn't exist", async function(){
      await expect(userManager.patchUser(2, {username:"bar"})).to.be.rejectedWith(NotFoundError);
    })
    it("encodes passwords", async function(){
      let next = await userManager.patchUser(u.uid, {password: "12345678"});
      expect(next).to.have.property("password").not.equal("12345678");
      expect(UserManager.isValidPasswordHash(next.password as string),`encoded password should be a valid password hash. Got : ${next.password}`).to.be.true;
    })
  })

  describe("getUsers()", function(){
    it("returns an empty list if folder doesn't exist", async function(){
      expect(await userManager.getUsers()).to.deep.equal([]);
    });
  });

  describe("getUserByName()", function(){
    it("find a user", async function(){ 
      let user = await userManager.addUser("foo", "12345678", false);
      await expect(userManager.getUserByName("foo")).to.eventually.deep.equal(user);
    });
    it("throws if user doesn't exist", async function(){
      await expect(userManager.getUserByName("foo")).to.be.rejectedWith(NotFoundError);
    })
    it("finds by email", async function(){
      let user = await userManager.addUser("foo", "12345678", false, "foo@example.com");
      await expect(userManager.getUserByName("foo@example.com")).to.eventually.deep.equal(user);

    })
  })

  describe("getUserByNamePassword()", function(){
    it("find a user", async function(){
      let user = await userManager.addUser("foo", "12345678", false);
      expect(user.password).to.be.ok;
      await expect(userManager.getUserByNamePassword("foo", "12345678")).to.eventually.deep.equal(user);
    });
    it("throws if user doesn't exist", async function(){
      await expect(userManager.getUserByNamePassword("foo", "bar")).to.be.rejectedWith(NotFoundError);
    });
    it("throws if password doesn't match", async function(){
      let user = await userManager.addUser("foo", "12345678", false);
      await expect(userManager.getUserByNamePassword("foo", "bar")).to.be.rejectedWith(UnauthorizedError);
    });
  });

  describe("getAccessRights() / grant()", function(){
    let user :User;
    this.beforeEach(async function(){
      await this.db.run(`INSERT INTO scenes (scene_name) VALUES ('foo')`);
      user = await userManager.addUser("foo", "12345678", false);
    });
    it("can return default permissions", async function(){
      let access = await userManager.getAccessRights("foo", user.uid);
      expect(access).to.equal("read");
    });
    it("can set permissions for any user", async function(){
      for(let role of AccessTypes.slice(2)/*read and more */){
        await userManager.grant("foo", "any", role);
        let access = await userManager.getAccessRights("foo", user.uid);
        expect(access).to.equal(role);
      }
    });
    it("can set user permissions", async function(){
      for(let role of AccessTypes){
        if(!role) continue; //Skip null
        await userManager.grant("foo", user.username, role);
        let access = await userManager.getAccessRights("foo", user.uid);
        expect(access).to.equal(role);
      }
    });
    it("can unset user permissions", async function(){
      await userManager.grant("foo", user.username, null);
      let access = await userManager.getAccessRights("foo", user.uid);
      expect(access).to.equal("read"); // default
    });
    it("can't provide unsupported role", async function(){
      await expect(userManager.grant("foo", user.username, "bar" as any)).to.be.rejectedWith("400");
    });
    it("can't provide bad username", async function(){
      await expect(userManager.grant("foo", "oscar", "read")).to.be.rejectedWith("404");
    });
  });
  describe("getPermissions()", async function(){
    let user :User;
    this.beforeEach(async function(){
      await this.db.run(`INSERT INTO scenes (scene_name) VALUES ('foo')`);
      user = await userManager.addUser("foo", "12345678", false);
    });
    it("get a scene permissions from name", async function(){
      let perms = await userManager.getPermissions("foo");
      expect(perms).to.deep.equal([
        { uid: 0, username: "default", access: 'read' }
      ]);
    });
  })

  describe("getKeys / addKey", function(){
    it("get an array of keys", async function(){
      let keys = await expect(userManager.getKeys()).to.be.fulfilled;
      expect(keys).to.have.property("length", 1);
      expect(keys[0]).to.be.a("string");
      expect(Buffer.from(keys[0], "base64")).to.have.property("length", 128/8);
    });
    it("add keys to be used", async function(){
      let [firstKey] = await userManager.getKeys();
      await expect(userManager.addKey()).to.be.fulfilled;
      let keys = await userManager.getKeys();
      expect(keys).to.have.property("length", 2);
      expect(Buffer.from(keys[0], "base64")).to.have.property("length", 128/8);
      expect(keys[0]).not.to.equal(firstKey);
      expect(keys[1]).to.equal(firstKey);
    });
  });
});
