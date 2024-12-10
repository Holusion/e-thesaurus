
import request from "supertest";
import Vfs from "../../../vfs/index.js";
import User from "../../../auth/User.js";
import UserManager from "../../../auth/UserManager.js";



/**
 * Minimal tests as most
 */

describe("GET /history/:scene/:id/diff", function(){
  let vfs :Vfs, userManager :UserManager, user :User, admin :User, opponent :User;
  let scene_id :number;
  this.beforeAll(async function(){
    let locals = await createIntegrationContext(this);
    vfs = locals.vfs;
    userManager = locals.userManager;
    user = await userManager.addUser("bob", "12345678");
    admin = await userManager.addUser("alice", "12345678", true);
    opponent = await userManager.addUser("oscar", "12345678");
    scene_id = await vfs.createScene("foo", user.uid);
  });

  this.afterAll(async function(){
    await cleanIntegrationContext(this);
  });

  it("get a text file's diff from previous version", async function(){
    await vfs.writeFile(dataStream(["Hello\n"]), {scene:scene_id, name:"hello.txt", user_id: 0, mime: "text/plain"});
    let ref = await vfs.writeFile(dataStream(["Hello World\n"]), {scene:scene_id, name:"hello.txt", user_id: 0, mime: "text/plain"});
    let res = await request(this.server).get(`/history/foo/${ref.id}/diff`)
    .set("Accept", "text/plain")
    .expect(200)
    .expect("Content-Type", "text/plain; charset=utf-8");
    expect(res.text).to.equal(`--- hello.txt\n+++ hello.txt\n@@ -1 +1 @@\n-Hello\n+Hello World\n`);
  });

  it("get diff summary for documents", async function(){
    await vfs.writeDoc(`{"label":"foo"}`, {scene: scene_id, name: "scene.svx.json", mime: "application/si-dpo-3d.document+json", user_id: 0});
    let ref = await vfs.writeDoc(`{"label":"bar"}`, {scene: scene_id, name: "scene.svx.json", mime: "application/si-dpo-3d.document+json", user_id: 0});
    let res = await request(this.server).get(`/history/foo/${ref.id}/diff`)
    .set("Accept", "application/json")
    .expect(200)
    .expect("Content-Type", "application/json; charset=utf-8");
    expect(res.body).to.have.property("diff").match(/Couldn't compile diff/);
    expect(res.body).to.have.property("src");
    expect(res.body).to.have.property("dst");
  })
});
