
import { Request, Response } from "express";
import { getUserManager } from "../../../utils/locals.js";




export default async function getPermissions(req :Request, res :Response){
  let userManager = getUserManager(req);
  let {scene} = req.params;
  let perms = await userManager.getPermissions(scene);
  res.status(200).send(perms);
};