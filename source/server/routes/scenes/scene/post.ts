import { Request, Response } from "express";

import { parse_glb } from "../../../utils/glTF.js";
import { getVfs, getUserId } from "../../../utils/locals.js";
import uid from "../../../utils/uid.js";
import getDefaultDocument from "../../../utils/schema/default.js";
import { BadRequestError } from "../../../utils/errors.js";


/**
 * Creates a new default document for a scene
 * uses data embedded in the glb to fill the document where possible
 * @param scene 
 * @param filepath 
 * @returns 
 */
async function getDocument(scene:string, filepath:string){
  let orig = await getDefaultDocument();
  //dumb inefficient Deep copy because we want to mutate the doc in-place
  let document = JSON.parse(JSON.stringify(orig));
  let meta = await parse_glb(filepath);
  let mesh = meta.meshes[0]; //Take the first mesh for its name
  document.nodes.push({
    "id": uid(),
    "name": mesh?.name ?? scene,
    "model": 0,
    "meta": 0
  } as any);
  document.scenes[0].nodes.push(document.nodes.length -1);

  document.models = [{
    "units": "m", //glTF specification says it's always meters. It's what blender do.
    "boundingBox": meta.bounds,
    "derivatives":[{
      "usage": "Web3D",
      "quality": "High",
      "assets": [
        {
          "uri": `models/${scene}.glb`,
          "type": "Model",
          "byteSize": meta.byteSize,
          "numFaces": meta.meshes.reduce((acc, m)=> acc+m.numFaces, 0),
          "imageSize": 8192
        }
      ]
    }],
    "annotations":[],
  }];
  document.metas = [{
    "collection": {
      "titles": {
        "EN": scene,
        "FR": scene,
      }
    },
  }]
  return document
}

/**
 * Tries to create a scene.
 * has consistency problems : a scene could get created without its associated 3D object
 * Whether or not it's desired behaviour remains to be defined
 */
export default async function postScene(req :Request, res :Response){
  let vfs = getVfs(req);
  let user_id = getUserId(req);
  let {scene} = req.params;

  if(req.is("multipart")|| req.is("application/x-www-form-urlencoded")){
    throw new BadRequestError(`${req.get("Content-Type")} content is not supported on this route. Provide a raw Zip attachment`);
  }

  let scene_id = await vfs.createScene(scene, user_id);
  try{
    let f = await vfs.writeFile(req, {user_id, scene: scene,  mime:"model/gltf-binary", name: `models/${scene}.glb`});
    let document = await getDocument(scene, vfs.filepath(f));
    await vfs.writeDoc(JSON.stringify(document), {scene: scene_id, user_id: user_id, name: "scene.svx.json", mime: "application/si-dpo-3d.document+json"});
  }catch(e){
    //If written, the file will stay as a loose object but will get cleaned-up later
    await vfs.removeScene(scene_id).catch(e=>console.warn(e));
    throw e;
  }
  res.status(201).send({code: 201, message: "created scene with id :"+scene_id});
};
