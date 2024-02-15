import fs from "fs/promises";
import path from "path";
import {tmpdir} from "os";
import { expect } from "chai";
import Vfs, { FileProps, GetFileParams, Scene, WriteFileParams } from "./index.js";
import { Uid } from "../utils/uid.js";
import UserManager from "../auth/UserManager.js";
import User from "../auth/User.js";
import { BadRequestError, ConflictError, NotFoundError } from "../utils/errors.js";

async function *dataStream(src :Array<Buffer|string> =["foo", "\n"]){
  for(let d of src){
    let b = Buffer.isBuffer(d)?d: Buffer.from(d);
    yield await Promise.resolve(b);
  }
}

async function empty(dir :string){
  return (await fs.readdir(dir)).length == 0;
}

function sceneProps(id:number): {[P in keyof Required<Scene>]: Function|any}{
  return {
    ctime: Date,
    mtime: Date,
    id: id,
    name: "foo",
    author: "default",
    author_id: 0,
    thumb: null,
    access:  { any: 'read', default: 'read' }
  };
}

describe("Vfs", function(){
  this.beforeEach(async function(){
    this.dir = await fs.mkdtemp(path.join(tmpdir(), `vfs_tests`));
    this.uploads = path.join(this.dir, "uploads"); //For quick reference
  });
  this.afterEach(async function(){
    await fs.rm(this.dir, {recursive: true});
  })
  it("opens upload directory", async function(){
    await Vfs.Open(this.dir);
    await expect(fs.access(path.join(this.dir, "uploads"))).to.be.fulfilled;
  });
  describe("isolate", function(){
    it("can rollback on error", async function(){
      let vfs = await Vfs.Open(this.dir);
      await expect(vfs.isolate(async (vfs)=>{
        await vfs.createScene("foo");
        await vfs.createScene("foo");
      })).to.be.rejected;
      expect(await vfs.getScenes()).to.have.property("length", 0);
    });
    it("can be nested", async function(){
      let vfs = await Vfs.Open(this.dir);
      let scenes = await expect(vfs.isolate( async (v2)=>{
        //This isolate rolls back but since we don't propagate the error
        //the parent will succeed
        await v2.isolate(async (v3)=>{
          await v3.createScene("foo");
          //Force this transaction to roll back
          throw new Error("TEST");
        }).catch(e=>{
          if(e.message !== "TEST") throw e;
        });
        return await v2.getScenes();
      })).to.be.fulfilled;
      expect(scenes).to.have.property("length", 0);
    });
  });

  describe("", function(){
    let vfs :Vfs; 
    //@ts-ignore
    const run = async (sql: ISqlite.SqlType, ...params: any[])=> await vfs.db.run(sql, ...params);
    //@ts-ignore
    const get = async (sql: ISqlite.SqlType, ...params: any[])=> await vfs.db.get(sql, ...params);
    //@ts-ignore
    const all = async (sql: ISqlite.SqlType, ...params: any[])=> await vfs.db.all(sql, ...params);

    this.beforeEach(async function(){
      vfs = await Vfs.Open(this.dir);
    });

    describe("createScene()", function(){
      it("insert a new scene", async function(){
        await expect(vfs.createScene("foo")).to.be.fulfilled;
      })
      it("throws on duplicate name", async function(){
        await expect(vfs.createScene("foo")).to.be.fulfilled;
        await expect(vfs.createScene("foo")).to.be.rejectedWith("exist");
      });
      it("retries for unused scene_id", async function(){
        let old = Uid.make;
        try{
          Uid.make = ()=> 1;
          await expect(vfs.createScene("bar")).to.be.fulfilled;
          await expect(vfs.createScene("bar")).to.be.rejectedWith("Unable to find a free id");
        }finally{
          Uid.make = old;
        }
      });
    });

    describe("getScenes()", function(){
      it("get an empty list", async function(){
        let scenes = await vfs.getScenes();
        expect(scenes).to.have.property("length", 0);
      })

      it("get a list of scenes", async function(){
        let scene_id = await vfs.createScene("foo");
        let scenes = await vfs.getScenes();
        expect(scenes).to.have.property("length", 1);
        let scene = scenes[0];

        let props = sceneProps(scene_id);
        let key:keyof Scene;
        for(key in props){
          if(typeof props[key] ==="undefined"){
            expect(scene, `${(scene as any)[key]}`).not.to.have.property(key);
          }else if(typeof props[key] === "function"){
            expect(scene).to.have.property(key).instanceof(props[key]);
          }else{
            expect(scene).to.have.property(key).to.deep.equal(props[key]);
          }
        }
      });

      it("get proper ctime and mtime from last document edit", async function(){
        let t2 = new Date();
        let t1 = new Date(Date.now()-100000);
        let scene_id = await vfs.createScene("foo");
        await vfs.writeDoc("{}", scene_id);
        let $doc_id = await vfs.writeDoc("{}", scene_id);
        //Force ctime
        await run(`UPDATE scenes SET ctime = $time`, {$time: t1.toISOString()});
        await run(`UPDATE documents SET ctime = $time WHERE doc_id = $doc_id`, {$time: t2.toISOString(), $doc_id});
        let scenes = await vfs.getScenes();
        expect(scenes).to.have.property("length", 1);
        expect(scenes[0].ctime.valueOf()).to.equal(t1.valueOf());
        expect(scenes[0].mtime.valueOf()).to.equal(t2.valueOf());
      });

      it("orders by names, case-insensitive and ascending", async function(){
        await Promise.all([
          vfs.createScene("a1"),
          vfs.createScene("aa"),
          vfs.createScene("Ab"),
        ]);
        let scenes = await vfs.getScenes();
        let names = scenes.map(s=>s.name);
        expect(names).to.deep.equal(["a1", "aa", "Ab"]);
      });

      it("can return existing thumbnails", async function(){
        let scene_id = await vfs.createScene("foo");
        await vfs.writeDoc(JSON.stringify({
          metas: [{}, {
            images:[{uri: "scene-image-thumb.jpg", quality: "Thumb"}]
          }]
        }), scene_id, 0);
        let s = await vfs.getScenes(0);
        expect(s).to.have.property("length", 1);
        expect(s[0]).to.have.property("thumb", "scene-image-thumb.jpg");
      })

      describe("with permissions", function(){
        let userManager :UserManager, user :User;
        this.beforeEach(async function(){
          userManager = new UserManager(vfs._db);
          user = await userManager.addUser("alice", "xxxxxxxx", false);
        });

        it("can filter accessible scenes by user_id", async function(){
          await vfs.createScene("foo", user.uid);
          await run(`UPDATE scenes SET access = json_object("0", "none", "${user.uid}", "admin")`);
          expect(await vfs.getScenes(0), `private scene shouldn't be returned to default user`).to.have.property("length", 0);
          expect(await vfs.getScenes(user.uid), `private scene should be returned to its author`).to.have.property("length", 1);
        });

        it("get proper author id and name", async function(){
          let scene_id = await vfs.createScene("foo", user.uid);
          await vfs.writeDoc("{}", scene_id, user.uid);
          let scenes = await vfs.getScenes();
          expect(scenes).to.have.property("length", 1);
          expect(scenes[0]).to.have.property("author", user.username);
          expect(scenes[0]).to.have.property("author_id", user.uid);
        });
        
        it("get proper user own access", async function(){
          let scene_id = await vfs.createScene("foo", {[user.uid.toString(10)]: "admin", "1": "write", "0": "none"});
          let scenes = await vfs.getScenes(user.uid);
          expect(scenes).to.have.property("length", 1);
          expect(scenes[0]).to.have.property("access").to.deep.equal({user:"admin", any: "write", default: "none"});
        });
        it("get proper \"any\" access", async function(){
          let scene_id = await vfs.createScene("foo", {"0":"read", "1": "write"});
          let scenes = await vfs.getScenes(user.uid);
          expect(scenes).to.have.property("length", 1);
          expect(scenes[0]).to.have.property("access").to.deep.equal({user: "none", any: "write", default: "read"});
        });
      });

      describe("search", async function(){
        let userManager :UserManager, user :User, admin :User;
        this.beforeEach(async function(){
          userManager = new UserManager(vfs._db);
          user = await userManager.addUser("bob", "xxxxxxxx", false);
          admin = await userManager.addUser("alice", "xxxxxxxx", true);
        });

        it("filters by access-level", async function(){
          await vfs.createScene("foo", {[`${admin.uid}`]: "admin", [`${user.uid}`]: "read"});
          expect(await vfs.getScenes(user.uid, {})).to.have.property("length", 1);
          expect(await vfs.getScenes(user.uid, {access:["admin"]})).to.have.property("length", 0);
        });

        it("won't return inaccessible content", async function(){
          await vfs.createScene("foo", {[`${admin.uid}`]: "admin", [`${user.uid}`]: "none", "0":"none", "1": "none"});
          expect(await vfs.getScenes(user.uid, {access:["none"]})).to.have.property("length", 0);
        });

        it("can select by specific user access level", async function(){
          await vfs.createScene("foo", {[`${admin.uid}`]: "admin", [`${user.uid}`]: "read", "0":"read", "1": "read"});
          expect(await vfs.getScenes(user.uid, {access:["read"]})).to.have.property("length", 1);
        });

        it("filters by name match", async function(){
          await vfs.createScene("Hello World", user.uid);
          await vfs.createScene("Goodbye World", user.uid);
          let s = await vfs.getScenes(user.uid, {match: "Hello"})
          expect(s, `[${s.map(s=>s.name).join(", ")}]`).to.have.property("length", 1);
        });

        it("Can have wildcards in name match", async function(){
          await vfs.createScene("Hello World", user.uid);
          await vfs.createScene("Goodbye World", user.uid);
          let s = await vfs.getScenes(user.uid, {match: "He%o"})
          expect(s, `[${s.map(s=>s.name).join(", ")}]`).to.have.property("length", 1);
        });

        it("can match a document's meta title", async function(){
          let scene_id = await vfs.createScene("foo", user.uid);
          await vfs.writeDoc(JSON.stringify({
            metas: [{collection:{
              titles:{EN: "Hello World", FR: "Bonjour, monde"}
            }}]
          }), scene_id, user.uid);
          let s = await vfs.getScenes(user.uid, {match: "He%o"});
          expect(s, `[${s.map(s=>s.name).join(", ")}]`).to.have.property("length", 1);
        });

        it("can match a document's article lead", async function(){
          let scene_id = await vfs.createScene("foo", user.uid);
          await vfs.writeDoc(JSON.stringify({
            metas: [{
              articles:[
                {leads:{EN: "Hello"}}
              ]
            }]
          }), scene_id, user.uid);
          let s = await vfs.getScenes(user.uid, {match: "He%o"});
          expect(s, `[${s.map(s=>s.name).join(", ")}]`).to.have.property("length", 1);
        });

        it("is case-insensitive", async function(){
          await vfs.createScene("Hello World", user.uid);
          let s = await vfs.getScenes(user.uid, {match: "hello"})
          expect(s, `[${s.map(s=>s.name).join(", ")}]`).to.have.property("length", 1);
        });

        it("can match the author's name", async function(){
          let scene_id = await vfs.createScene("foo", user.uid);
          await vfs.writeDoc(JSON.stringify({}), scene_id, user.uid);
          let s = await vfs.getScenes(user.uid, {match: user.username});
          expect(s, `[${s.map(s=>s.name).join(", ")}]`).to.have.property("length", 1);
        });

        it("can match an editor's name", async function(){
          let scene_id = await vfs.createScene("foo", admin.uid);
          await vfs.writeDoc(JSON.stringify({}), scene_id, admin.uid);

          let s = await vfs.getScenes(user.uid, {match: user.username});
          expect(s, `[${s.map(s=>s.name).join(", ")}]`).to.have.property("length", 0);
          
          await vfs.writeDoc(JSON.stringify({scene: 0}), scene_id, user.uid);
          
          s = await vfs.getScenes(user.uid, {match: user.username});
          expect(s, `[${s.map(s=>s.name).join(", ")}]`).to.have.property("length", 1);
        });

        it("can search against multiple search terms", async function(){
          let scene_id = await vfs.createScene("bar", user.uid);
          await vfs.writeDoc(JSON.stringify({
            metas: [{
              articles:[
                {leads:{EN: "Hello World, this is User"}}
              ]
            }]
          }), scene_id, user.uid);

          scene_id = await vfs.createScene("foo1", admin.uid);
          await vfs.writeDoc(JSON.stringify({}), scene_id, admin.uid);

          scene_id = await vfs.createScene("foo2", user.uid);
          await vfs.writeDoc(JSON.stringify({}), scene_id, user.uid);
          
          let s = await vfs.getScenes(user.uid, {match: `foo ${user.username}`});
          expect(s, `[${s.map(s=>s.name).join(", ")}]`).to.have.property("length", 1);
          expect(s[0]).to.have.property("name", "foo2");

          s = await vfs.getScenes(user.uid, {match: `Hello User`});
          expect(s, `[${s.map(s=>s.name).join(", ")}]`).to.have.property("length", 1);
          expect(s[0]).to.have.property("name", "bar");
        });

      });

      describe("pagination", function(){
        it("rejects bad LIMIT", async function(){
          let fixtures = [-1, "10", null];
          for(let f of fixtures){
            await expect(vfs.getScenes(0, {limit: f as any})).to.be.rejectedWith(BadRequestError);
          }
        });

        it("rejects bad OFFSET", async function(){
          let fixtures = [-1, "10", null];
          for(let f of fixtures){
            await expect(vfs.getScenes(0, {limit: f as any})).to.be.rejectedWith(BadRequestError);
          }
        });

        it("respects pagination options", async function(){
          for(let i = 0; i < 10; i++){
            await vfs.createScene(`scene_${i}`);
          }
          let res = await vfs.getScenes(0, {limit: 1, offset: 0})
          expect(res).to.have.property("length", 1);
          expect(res[0]).to.have.property("name", "scene_0");

          res = await vfs.getScenes(0, {limit: 2, offset: 2})
          expect(res).to.have.property("length", 2);
          expect(res[0]).to.have.property("name", "scene_2");
          expect(res[1]).to.have.property("name", "scene_3");
        });

        it("limits LIMIT to 100", async function(){
          for(let i = 0; i < 110; i++){
            await vfs.createScene(`scene_${i}`);
          }
          let res = await vfs.getScenes(0, {limit: 110, offset: 0})
          expect(res).to.have.property("length", 100);
          expect(res[0]).to.have.property("name", "scene_0");
        })
      });
    });

    describe("createFolder(), removeFolder(), listFolders()", function(){
      let scene_id :number;
      this.beforeEach(async function(){
        scene_id = await vfs.createScene("foo", 0);
      })

      it("create a folder in a scene", async function(){
        await vfs.createFolder({scene:scene_id, name: "videos", user_id: 0});
        let folders = await vfs.listFolders(scene_id);
        //order is by mtime descending, name ascending so we can't rely on it
        expect(folders.map(f=>f.name)).to.have.members(["articles", "models", "videos"]);
        expect(folders).to.have.length(3);
      });

      it("create a tree of folders", async function(){
        await vfs.createFolder({scene:scene_id, name: "articles/videos",  user_id: 0});
        let folders = await vfs.listFolders(scene_id)
        expect(folders.map(f=>f.name)).to.deep.equal(["articles", "articles/videos", "models"]);
      });

      it("don't accept a trailing slash", async function(){
        await expect(vfs.createFolder({scene:scene_id, name: "videos/", user_id: 0})).to.be.rejectedWith(BadRequestError);
      });

      it("don't accept absolute paths", async function(){
        await expect(vfs.createFolder({scene:scene_id, name: "/videos", user_id: 0})).to.be.rejectedWith(BadRequestError);
      });

      it("throws an error if folder exists", async function(){
        await vfs.createFolder({scene: scene_id, name: "videos",  user_id: 0});
        await expect( vfs.createFolder({scene: scene_id, name: "videos",  user_id: 0}) ).to.be.rejectedWith(ConflictError);
      });

      it("throws an error if folder doesn't exist", async function(){
        await expect(vfs.removeFolder({scene: scene_id, name: "videos", user_id: 0})).to.be.rejectedWith(NotFoundError);
      });

      it("remove a scene's folder", async function(){
        await vfs.createFolder({scene:scene_id, name: "videos", user_id: 0});
        await vfs.removeFolder({scene: scene_id, name: "videos", user_id: 0});
        let folders = await vfs.listFolders(scene_id)
        expect(folders.map(f=>f.name)).to.deep.equal(["articles", "models"]);
        await vfs.createFolder({scene:scene_id, name: "videos", user_id: 0});
        folders = await vfs.listFolders(scene_id)
        expect(folders.map(f=>f.name).sort()).to.deep.equal(["videos", "models", "articles"].sort());
      });

      it("removeFolder() removes all files in the folder", async function(){
        let userManager = new UserManager(vfs._db);
        let user = await userManager.addUser("alice", "xxxxxxxx", false);
        await vfs.createFolder({scene:scene_id, name: "videos", user_id: 0});
        await vfs.writeFile(dataStream(), {scene: scene_id, name: "videos/foo.mp4", mime:"video/mp4", user_id: 0});

        await vfs.removeFolder({scene: scene_id, name: "videos", user_id: user.uid });

        let files = await vfs.listFiles(scene_id);
        expect(files).to.deep.equal([]);
      });
    });

    describe("", function(){
      let scene_id :number;
      //Create a dummy scene for future tests
      this.beforeEach(async function(){
        scene_id = await vfs.createScene("foo");
      });
      
      describe("renameScene()", function(){
        it("can change a scene name", async function(){
          await expect(vfs.renameScene(scene_id, "bar")).to.be.fulfilled;
        });
        it("throw a 404 error", async function(){
          await expect(vfs.renameScene(404, "bar")).to.be.rejectedWith("404");
        });
      })

      describe("archiveScene()", function(){
        it("set access rights to none", async function(){
          await vfs.archiveScene("foo");
          expect(await vfs.getScenes(0)).to.have.property("length", 0);
        });
      });

      describe("createFile()", function(){
        it("can create an empty file", async function(){
          let r = await vfs.createFile( {scene: "foo", mime: "text/html", name: "articles/foo.txt", user_id: 0}, {hash: null, size: 0});
          expect(r).to.have.property("id");
          expect(r).to.have.property("generation", 1);
          expect(r).to.have.property("hash", null);
        });

        it("can create a dummy file", async function(){
          let r = await vfs.createFile( {scene: "foo", mime: "text/html", name: "articles/foo.txt", user_id: 0}, {hash: "xxxxxx", size: 150});
        })

        it("autoincrements generation", async function(){
          await vfs.createFile( {scene: "foo", mime: "text/html", name: "articles/foo.txt", user_id: 0}, {hash: "xxxxxx", size: 150});
          let r = await vfs.createFile( {scene: "foo", mime: "text/html", name: "articles/foo.txt", user_id: 0}, {hash: "yyyyy", size: 150});
          expect(r).to.have.property("generation", 2);
        })
        it("can copy a file", async function(){
          let foo = await vfs.createFile( {scene: "foo", mime: "text/html", name: "articles/foo.txt", user_id: 0}, {hash: "xxxxxx", size: 150});
          let bar = await vfs.createFile( {scene: "foo", mime: "text/html", name: "articles/bar.txt", user_id: 0}, {hash: "xxxxxx", size: 150});
          expect(bar).to.have.property("id").not.equal(foo.id);
          expect(bar).to.have.property("generation", 1);
          expect(bar).to.have.property("hash", foo.hash);
          expect(bar).to.have.property("size", foo.size);
        });

      })
      describe("writeFile()", function(){
        it("can upload a file (relative)", async function(){
          let r = await vfs.writeFile(dataStream(["foo","\n"]), {scene: "foo", mime: "text/html", name: "articles/foo.txt", user_id: 0});
          expect(r).to.have.property("id").a("number");
          expect(r).to.have.property("generation", 1);
          await expect(fs.access(path.join(this.dir, "objects", r.hash as any)), "can't access object file").to.be.fulfilled;
          await expect(empty(this.uploads));
        });

        it("can upload a file (absolute)", async function(){
          let r = await expect(
            vfs.writeFile(dataStream(["foo","\n"]), {scene: "foo", mime: "text/html", name: "articles/foo.txt", user_id: 0})
          ).to.be.fulfilled;
          expect(r).to.have.property("generation", 1);
          expect(r).to.have.property("id").a("number");

          await expect(fs.access(path.join(this.dir, "objects", r.hash)), "can't access object file").to.be.fulfilled;
          await expect(empty(this.uploads));
        });
        it("gets proper generation", async function(){
          await vfs.writeFile(dataStream(["foo","\n"]), {scene: "foo", mime: "text/html", name: "articles/foo.txt", user_id: 0});
          for(let i=2; i < 5; i++){
            let foo = await vfs.writeFile(dataStream(["bar","\n"]), {scene: "foo", mime: "text/html", name: "articles/foo.txt", user_id: 0});
            expect(foo).to.have.property("generation", i);
          }
          let bar = await vfs.writeFile(dataStream(["bar","\n"]), {scene: "foo", mime: "text/html", name: "articles/bar.txt", user_id: 0});
          expect(bar).to.have.property("generation", 1);
        });
        it("can upload over an existing file", async function(){
          await expect(
            vfs.writeFile(dataStream(["foo","\n"]), {scene: "foo", mime: "text/html", name: "articles/foo.txt", user_id: 0})
          ).to.eventually.have.property("generation", 1);
          let r = await expect(
            vfs.writeFile(dataStream(["bar","\n"]), {scene: "foo", mime: "text/html", name: "articles/foo.txt", user_id: 0})
          ).to.be.fulfilled;

          expect(r).to.have.property("generation", 2);
          await expect(fs.access(path.join(this.dir, "objects", r.hash)), "can't access object file").to.be.fulfilled;
          await expect(empty(this.uploads));
        });
  
        it("cleans up on errors", async function(){
          async function* badStream(){
            yield Promise.resolve(Buffer.from("foo"));
            yield Promise.reject(new Error("CONNRESET"));
          }
          await expect(vfs.writeFile(badStream(), {scene: "foo", mime: "text/html", name: "articles/foo.txt", user_id: 0})).to.be.rejectedWith("CONNRESET");
          await expect(fs.access(path.join(this.dir, "foo.txt")), "can't access foo.txt").to.be.rejectedWith("ENOENT");
          await expect(empty(this.uploads));
        });
      });



      describe("", function(){
        let r:FileProps, ctime :Date;
        let props :GetFileParams = {scene: "foo", name: "articles/foo.txt"};
        this.beforeEach(async function(){
          r = await vfs.writeFile(dataStream(["foo","\n"]), {...props, mime: "text/html", user_id: 0} );
          ctime = r.ctime;
        });
        describe("getFileProps", function(){
          it("get a file properties", async function(){
            let r = await expect(vfs.getFileProps(props)).to.be.fulfilled;
            expect(r).to.have.property("generation", 1);
            expect(r).to.have.property("ctime").instanceof(Date);
            expect(r).to.have.property("mtime").instanceof(Date);
            expect(r.ctime.valueOf()).to.equal(ctime.valueOf());
            expect(r.mtime.valueOf()).to.equal(ctime.valueOf());
          });
          it("uses the same format as writeFile", async function(){
            await expect(vfs.getFileProps(props)).to.eventually.deep.equal(r);
          })
          it("get proper mtime and ctime", async function(){
            let mtime = new Date(Math.floor(Date.now())+100*1000);
            let r = await vfs.writeFile(dataStream(["foo","\n"]), {...props, user_id: 0});
            r = await expect(run(`UPDATE files SET ctime = $time WHERE file_id = $id`, {$id: r.id, $time: mtime.toISOString()})).to.be.fulfilled;
            expect(r).to.have.property("changes", 1);
            r = await expect(vfs.getFileProps(props)).to.be.fulfilled;
            expect(r.ctime.valueOf()).to.equal(ctime.valueOf());
            expect(r.mtime.valueOf()).to.equal(mtime.valueOf());
          });

          it("can use a scene ID", async function(){
            let r = await expect(vfs.getFileProps({...props, scene: scene_id})).to.be.fulfilled;
            expect(r).to.have.property("name", props.name);
          })

          it("throw 404 error if file doesn't exist", async function(){
            await expect(vfs.getFileProps({...props, name: "bar.html"})).to.be.rejectedWith("404");
          });
        });
        describe("getFile()", function(){
          it("get a file", async function(){
            let {stream} = await vfs.getFile(props);
            let str = "";
            for await (let d of stream){
              str += d.toString("utf8");
            }
            expect(str).to.equal("foo\n");
          });
          it("throw 404 error if file doesn't exist", async function(){
            await expect(vfs.getFile({...props, name: "bar.html"})).to.be.rejectedWith("404");
          });

          it("won't try to open a folder", async function(){
            await expect(vfs.getFile({scene: props.scene, name: "articles"})).to.be.rejectedWith(BadRequestError);
          });
        });
  
        describe("getFileHistory()", function(){
          it("get previous versions of a file", async function(){
            let r2 = await vfs.writeFile(dataStream(["foo2","\n"]), {...props, user_id: 0} );
            let r3 = await vfs.writeFile(dataStream(["foo3","\n"]), {...props, user_id: 0} );
            await vfs.writeFile(dataStream(["bar","\n"]), {...props, name:"bar", user_id: 0} ); //another file
            let versions = await vfs.getFileHistory(props);
            let fileProps = await vfs.getFileProps(props);
            //Expect reverse order
            expect(versions.map(v=>v.generation)).to.deep.equal([3, 2, 1]);
            versions.forEach((version, i)=>{
              expect(Object.keys(version).sort(),`Bad file properties at index ${i}`).to.deep.equal(Object.keys(fileProps).sort())
            });
          });
          it("works using a scene's name", async function(){
            await expect(vfs.getFileHistory({...props, scene: "foo"})).to.be.fulfilled;
          });
          it("throw a 404 if file doesn't exist", async function(){
            await expect(vfs.getFileHistory({...props, name: "missing"})).to.be.rejectedWith("404");
          });
          it("throw a 404 if scene doesn't exist (by name)", async function(){
            await expect(vfs.getFileHistory({...props, scene: "missing"})).to.be.rejectedWith("404");
          });
          it("throw a 404 if scene doesn't exist (by id)", async function(){
            await expect(vfs.getFileHistory({...props, scene: scene_id+1})).to.be.rejectedWith("404");
          });
        });

        describe("removeFile()", function(){
          it("add an entry with state = REMOVED", async function(){
            await vfs.removeFile({...props, user_id: 0});
            let files = await all(`SELECT * FROM files WHERE name = "${props.name}"`);
            expect(files).to.have.property("length", 2);
            expect(files[0]).to.include({
              hash: "tbudgBSg-bHWHiHnlteNzN8TUvI80ygS9IULh4rklEw",
              generation: 1
            });
            expect(files[1]).to.include({
              hash: null,
              generation: 2
            });
          });
          it("requires the file to actually exist", async function(){
            await expect(vfs.removeFile({...props, name: "bar.txt", user_id: 0})).to.be.rejectedWith("404");
          });
          it("require file to be in active state", async function(){
            await expect(vfs.removeFile({...props, user_id: 0})).to.be.fulfilled,
            await expect(vfs.removeFile({...props, user_id: 0})).to.be.rejectedWith("already deleted");
          });
        });
  
        describe("renameFile()", function(){
  
          it("rename a file", async function(){
            await vfs.renameFile({...props, user_id: 0}, "bar.txt");
            await expect(vfs.getFileProps(props), "old file should not be reported anymore").to.be.rejectedWith("404");
            let file = await expect(vfs.getFileProps({...props, name: "bar.txt"})).to.be.fulfilled;
            expect(file).to.have.property("mime", "text/html");
          });
          
          it("throw 404 error if file doesn't exist", async function(){
            await expect(vfs.renameFile({...props, user_id: 0, name: "bar.html"}, "baz.html")).to.be.rejectedWith("404");
          });
  
          it("file can be created back after rename", async function(){
            await vfs.renameFile({...props, user_id: 0}, "bar.txt");
            await vfs.writeFile(dataStream(["foo","\n"]), {...props, user_id: 0} );
            await expect(vfs.getFileProps({...props, name: "bar.txt"})).to.be.fulfilled;
            //Check if it doesn't mess with the history
            let hist = await vfs.getFileHistory(props);
            expect(hist.map(f=>f.hash)).to.deep.equal([
              "tbudgBSg-bHWHiHnlteNzN8TUvI80ygS9IULh4rklEw",
              null,
              "tbudgBSg-bHWHiHnlteNzN8TUvI80ygS9IULh4rklEw"
            ]);
          });
          it("can move to a deleted file", async function(){
            await vfs.renameFile({...props, user_id: 0}, "bar.txt");
            //move it back in place after it was deleted
            await vfs.renameFile({...props, name: "bar.txt", user_id: 0}, props.name);
            let hist = await vfs.getFileHistory(props);
            expect(hist.map(f=>`${f.name}#${f.generation}: ${f.hash}`)).to.deep.equal([
              `articles/foo.txt#3: tbudgBSg-bHWHiHnlteNzN8TUvI80ygS9IULh4rklEw`,
              `articles/foo.txt#2: null`,
              `articles/foo.txt#1: tbudgBSg-bHWHiHnlteNzN8TUvI80ygS9IULh4rklEw`
            ]);
            await expect(vfs.getFile({...props, name: "bar.txt"})).to.be.rejectedWith(NotFoundError);
          });
          it("can move in a folder", async function(){
            await vfs.renameFile({...props, user_id: 0}, "articles/bar.txt");
            await expect(vfs.getFileProps(props)).to.be.rejectedWith(NotFoundError);
            expect(await vfs.getFileProps({...props, name: "articles/bar.txt"})).to.have.property("hash", "tbudgBSg-bHWHiHnlteNzN8TUvI80ygS9IULh4rklEw");
          });
        });
      })
      

      describe("writeDoc()", function(){
        it("insert a new document using scene_id", async function(){
          await vfs.writeDoc("{}", scene_id);
          await expect(all(`SELECT * FROM documents`)).to.eventually.have.property("length", 1);
        })
        it("insert a new document using scene_name", async function(){
          await vfs.writeDoc("{}", "foo");
          await expect(all(`SELECT * FROM documents`)).to.eventually.have.property("length", 1);
        })
        it("requires a scene to exist", async function(){
          await expect(vfs.writeDoc("{}", 125 /*arbitrary non-existent scene id */)).to.be.rejectedWith("404");
          await expect(all(`SELECT * FROM documents`)).to.eventually.have.property("length", 0);
        });
        it("can provide an author", async function(){
          let {user_id} = await get(`INSERT INTO users ( username ) VALUES ("alice") RETURNING printf("%x", user_id) AS user_id`);
          await expect(vfs.writeDoc("{}", scene_id, user_id)).to.be.fulfilled;
          await expect(all(`SELECT data, printf("%x", fk_author_id) as fk_author_id FROM documents`)).to.eventually.deep.include({
            data: "{}",
            fk_author_id: user_id,
          });
        });
        it("updates scene's current doc", async function(){
          for(let i = 1; i<=3; i++){
            let id = await vfs.writeDoc(`{"i":${i}}`, scene_id);
            await expect(vfs.getDoc(scene_id)).to.eventually.deep.include({id});
          }
        });
      });

      
      describe("getScene()", function(){
        this.beforeEach(async function(){
          await vfs.writeDoc("{}", scene_id, 0);
        });

        it("throw an error if not found", async function(){
          await expect(vfs.getScene("bar")).to.be.rejectedWith("scene_name");
        });

        it("get a valid scene", async function(){
          let scene = await vfs.getScene("foo");

          let props = sceneProps(scene_id);
          let key:keyof Scene;
          for(key in props){
            if(typeof props[key] ==="undefined"){
              expect(scene, `${(scene as any)[key]}`).not.to.have.property(key);
            }else if(typeof props[key] === "function"){
              expect(scene).to.have.property(key).instanceof(props[key]);
            }else{
              expect(scene).to.have.property(key).to.deep.equal(props[key]);
            }
          }
        });

        it("get an empty scene", async function(){
          let id = await vfs.createScene("empty");
          let scene = await vfs.getScene("empty");
          expect(scene).to.have.property("ctime").instanceof(Date);
          expect(scene).to.have.property("mtime").instanceof(Date);
          expect(scene).to.have.property("id", id).a("number");
          expect(scene).to.have.property("name", "empty");
          expect(scene).to.have.property("author", "default");
        });

        it("get a scene's thumbnail if it exist", async function(){
          await vfs.writeDoc(JSON.stringify({
            metas: [{}, {
              images:[{uri: "scene-image-thumb.jpg", quality: "Thumb"}]
            }]
          }), scene_id, 0);
          let s = await vfs.getScenes(0);
          expect(s[0]).to.have.property("thumb", "scene-image-thumb.jpg");
        });

        it("get requester's access right", async function(){
          let userManager = new UserManager(vfs._db);
          let alice = await userManager.addUser("alice", "xxxxxxxx", false);

          let id = await vfs.createScene("alice's", alice.uid);
          await vfs.writeDoc("{}", id, alice.uid);
          let scene = await vfs.getScene("alice's", alice.uid);
          expect(scene).to.have.property("access").to.have.property("user").to.equal("admin");
        });
        it("performs requests for default user", async function(){
          let scene = await vfs.getScene("foo", 0);
          expect(scene).to.be.ok;
        })
      });

      describe("getSceneHistory()", function(){
        let default_folders = 2
        it("get an ordered history of all writes to a scene", async function(){
          let fileProps :WriteFileParams = {user_id: 0, scene:scene_id, mime: "model/gltf-binary", name:"models/foo.glb"}
          await vfs.writeFile(dataStream(), fileProps);
          await vfs.writeDoc("{}", scene_id, 0);
          await vfs.writeFile(dataStream(), fileProps);
          await vfs.writeDoc("{}", scene_id, 0);
          let history = await vfs.getSceneHistory(scene_id);
          expect(history).to.have.property("length", 4 + default_folders);
          //Couln't easily test ctime sort
          expect(history.map(e=>e.name)).to.deep.equal([
            "scene.svx.json",
            "scene.svx.json",
            "models/foo.glb",
            "models/foo.glb",
            "models",
            "articles",
          ]);
          expect(history.map(e=>e.generation)).to.deep.equal([2,1,2,1,1,1]);
        });
        it("reports proper size for data strings", async function(){
          //By default sqlite counts string length as char length and not byte length
          let str = `{"id":"你好"}`;
          expect(str.length).not.to.equal(Buffer.byteLength(str));
          await vfs.writeDoc(str, scene_id, 0);
          let history = await vfs.getSceneHistory(scene_id);
          expect(history).to.have.property("length", 1+ default_folders);
          expect(history.find(f=>f.name == "scene.svx.json")).to.have.property("size", Buffer.byteLength(str));
        })
        it.skip("supports pagination");
      });

      describe("listFiles()", function(){
        let tref = new Date("2022-12-08T10:49:46.196Z");

        it("Get files created for a scene", async function(){
          let f1 = await vfs.writeFile(dataStream(), {user_id: 0, scene:"foo", mime: "model/gltf-binary", name:"models/foo.glb"});
          let f2 = await vfs.writeFile(dataStream(), {user_id: 0, scene:"foo",  mime: "image/jpeg", name:"foo.jpg"});
          await run(`UPDATE files SET ctime = $t`, {$t:tref.toISOString()});
          let files = await vfs.listFiles(scene_id);
          expect(files).to.deep.equal([
            {
              size: 4,
              hash: 'tbudgBSg-bHWHiHnlteNzN8TUvI80ygS9IULh4rklEw',
              generation: 1,
              id: f2.id,
              name: 'foo.jpg',
              mime: "image/jpeg",
              ctime: tref,
              mtime: tref,
              author_id: 0,
              author: "default",
            },{
              size: 4,
              hash: 'tbudgBSg-bHWHiHnlteNzN8TUvI80ygS9IULh4rklEw',
              generation: 1,
              id: f1.id,
              name: 'models/foo.glb',
              mime: "model/gltf-binary",
              ctime: tref,
              mtime: tref,
              author_id: 0,
              author: "default",
            }
          ]);
        });

        it("Groups files versions", async function(){
          let tnext = new Date(tref.getTime()+8000);
          let originalFiles = (await all("SELECT * FROM files")).length
          let f1 = await vfs.writeFile(dataStream(["foo", "\n"]), {user_id: 0, scene:"foo",  mime: "model/gltf-binary", name:"models/foo.glb"});
          let del = await  vfs.createFile({user_id: 0, scene:"foo", mime: "model/gltf-binary", name:"models/foo.glb"}, {hash: null, size: 0});
          let f2 = await vfs.writeFile(dataStream(["hello world", "\n"]), {user_id: 0, scene:"foo", mime: "model/gltf-binary", name:"models/foo.glb"});
          await expect(all("SELECT * FROM files")).to.eventually.have.property("length", 3+originalFiles);
          await run(`UPDATE files SET ctime = $t WHERE file_id = $id`, {$t:tref.toISOString(), $id:f1.id});
          await run(`UPDATE files SET ctime = $t WHERE file_id = $id`, {$t:tref.toISOString(), $id:del.id});
          await run(`UPDATE files SET ctime = $t WHERE file_id = $id`, {$t:tnext.toISOString(), $id:f2.id});

          let files = await vfs.listFiles(scene_id);
          expect(files).to.have.property("length", 1);
          expect(files).to.deep.equal([{
            size: 12,
            hash: 'qUiQTy8PR5uPgZdpSzAYSw0u0cHNKh7A-4XSmaGSpEc',
            generation: 3,
            id: f2.id,
            name: 'models/foo.glb',
            mime: "model/gltf-binary",
            ctime: tref,
            mtime: tnext,
            author_id: 0,
            author: "default",
          }]);
        });

        it("returns only files that are not removed", async function(){
          let props :WriteFileParams = {user_id: 0, scene:"foo", mime: "model/gltf-binary", name:"models/foo.glb"}
          let f1 = await vfs.writeFile(dataStream(), props);
          await vfs.removeFile(props);
          let files = await vfs.listFiles(scene_id);
          expect(files).to.have.property("length", 0);
        });

        it("can get a list of archived files", async function(){
          await vfs.writeFile(dataStream(["foo", "\n"]), {user_id: 0, scene: scene_id, mime: "text/html", name:"articles/hello.txt"});
          let del = await  vfs.createFile({user_id: 0, scene: scene_id, name:"articles/hello.txt"}, {hash: null, size: 0});

          let files = await vfs.listFiles(scene_id, true);
          expect(files).to.have.property("length", 1);
          expect(files[0]).to.have.property("hash", null);
          expect(files[0]).to.have.property("id", del.id);
        });
      });
      
      describe("getDoc()", function(){
        it("throw if not found", async function(){
          await expect(vfs.getDoc(scene_id)).to.be.rejectedWith("No document for scene_id");
        });
        it("fetch currently active document", async function(){
          let id = await vfs.writeDoc("{}", scene_id);
          let doc = await vfs.getDoc(scene_id);
          expect(doc).to.have.property("id", id);
          expect(doc).to.have.property("ctime").instanceof(Date);
          expect(doc).to.have.property("mtime").instanceof(Date);
          expect(doc).to.have.property("author_id", 0);
          expect(doc).to.have.property("author", "default");
          expect(doc).to.have.property("data", "{}");
          expect(doc).to.have.property("generation", 1);
        });
        it("fetch a specific generation of a document", async function(){
          let generation;
          for(let i = 0; i<4; i++){
            let r = await vfs.writeDoc(`{"i":${i}}`, scene_id);
            if(i==2) generation = r;
          }
          let doc = await vfs.getDoc(scene_id, generation);
          expect(doc).not.to.deep.equal(await vfs.getDoc(scene_id));
          expect(doc).to.have.property("generation", generation);
        })
      });
      describe("getDocHistory()", function(){
        it("throw if not found", async function(){
          await expect(vfs.getDocHistory(scene_id)).to.be.rejectedWith("No document for scene_id");
        });
        it("fetch all generations of a document", async function(){
          for(let i=1; i <=3; i++){
            await vfs.writeDoc(`{"i":${i}}`, scene_id);
          }
          let docs = await vfs.getDocHistory(scene_id);
          expect(docs).to.be.an("array");
          expect(docs.map(d=>d.generation)).to.deep.equal([3,2,1]);
        })
      })
    });
  });
});
