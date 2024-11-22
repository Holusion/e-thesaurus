import { Request, Response } from "express";
import { getVfs } from "../utils/locals.js";
import { ElementCompact, js2xml } from "xml-js";
import { default_id } from "../auth/UserManager.js";

type XMLURLSet = {
  url: XMLURLEntry[];
} & ElementCompact;

interface XMLURLEntry{
  loc:{_text: string};
  lastmod?:{_text:string}
  "image:image"?:{"image:loc":{_text:string}}
}

export default async function getSitemap(req :Request, res :Response){
  const vfs = getVfs(req);
  let host = new URL(`${req.protocol}://${req.hostname}`);
  //sitemap should NOT be user-dependant.
  const scenes = await vfs.getScenes(default_id);
  let urlset :XMLURLSet = {
    _attributes:{
      "xmlns": "http://www.sitemaps.org/schemas/sitemap/0.9",
      "xmlns:image":"http://www.google.com/schemas/sitemap-image/1.1",
    },
    url: scenes.map(s=>{
      let entry :XMLURLEntry = {
        loc:{_text: new URL(`/ui/scenes/${encodeURIComponent(s.name)}/view`, host).toString()},
        lastmod: {_text: s.mtime.toISOString()},
      }
      if(s.thumb){
        entry["image:image"] = {
          "image:loc":{_text: new URL(s.thumb, host).toString()}
        }
      }
      return entry;
    }),
  };

  let doc = js2xml({
    _declaration: {
      _attributes: {
        version: "1.0",
        encoding: "utf-8",
      }
    },
    urlset,
  }, {compact: true});
  res.set("Content-Type", "application/xml");
  res.status(200).send(doc);
}