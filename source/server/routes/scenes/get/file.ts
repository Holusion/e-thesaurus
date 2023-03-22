
import { getFileParams, getUserId, getVfs } from "../../../utils/locals";
import { Request, Response } from "express";


/**
 * @todo use file compression for text assets. Data _should_ be compressed at rest on the server
 */
export default async function handleGetFile(req :Request, res :Response){
  const vfs = getVfs(req);
  const {scene, name} = getFileParams(req);
  let f = await vfs.getFile({ scene, name });

  res.set("ETag", `W/${f.hash}`);
  res.set("Last-Modified", f.mtime.toUTCString());
  if(req.fresh){
    f.stream.destroy();
    return res.status(304).send("Not Modified");
  }
  
  res.set("Content-Type", f.mime);
  res.set("Content-Length", f.size.toString(10));
  res.status(200);

  f.stream.pipe(res);
};