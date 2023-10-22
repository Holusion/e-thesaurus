import { Request, Response } from "express";
import User, { SafeUser } from "../../../../../auth/User.js";
import { UnauthorizedError } from "../../../../../utils/errors.js";
import { getUser, getUserManager } from "../../../../../utils/locals.js";




export async function handlePatchUser(req:Request, res :Response){
  const {uid}= req.params;
  const update = req.body;
  const requester = getUser(req);
  const isAdmin = requester.isAdministrator;
  const userManager = getUserManager(req);

  if(!isAdmin && typeof update.isAdministrator !== "undefined"){
    throw new UnauthorizedError(`Only administrators can change admin status`);
  }

  if(isAdmin && update.isAdministrator === false){
    throw new UnauthorizedError(`Administrators can't demote themselves`);
  }

  if(!isAdmin && uid !== requester.uid.toString(10)){
    throw new UnauthorizedError(`Can't change user ${uid}`);
  }

  let u = await userManager.patchUser(parseInt(uid, 10), update);
  Object.assign(req.session as SafeUser, User.safe(u));
  res.status(200).send(User.safe(u));
}