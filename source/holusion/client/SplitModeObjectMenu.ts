/**
 * 3D Foundation Project
 * Copyright 2019 Smithsonian Institution
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

 import CustomElement, { customElement, property, html } from "@ff/ui/CustomElement";
 import "@ff/ui/Button";
 
import Notification from "@ff/ui/Notification";
import System from "@ff/graph/System";
import SplitUserInterface from "SplitUserInterface/SplitUserInterface";
 
 

export interface IDocumentParams
{
    id:string;
    root:string;
    document:string;
    title:string;
    caption:string;
    thumbnail:string;
}



 
 @customElement("split-object-menu")
 export default class SplitModeObjectMenu extends CustomElement
 {
    private loop :number;
    @property({attribute:false, type: Array })
    docs :IDocumentParams[];


    constructor(){
        super();
        this.docs = JSON.parse(localStorage.getItem("playlist-documents") || "[]") as IDocumentParams[] ;
    }
     protected firstConnected()
     {
        super.firstConnected();
        this.classList.add("split-object-menu");
         
        fetch("/documents.json").then(async (res)=>{
            if(!res.ok) throw new Error(`[${res.status}]: ${res.statusText}`);
            let body = await res.json();
            if(!Array.isArray(body.documents) || body.documents.length == 0)throw new Error(`Bad documents list : `+ body);
            this.docs = body.documents;
            localStorage.setItem("playlist-documents", JSON.stringify(this.docs));
            let idx = Math.floor(Math.random()*this.docs.length);
            this.dispatchEvent(new CustomEvent("select", {
                detail: `/?root=${this.docs[idx].root}`
            }));
        }).catch(e=>{
            Notification.show("Failed to get documents : "+e.message, "error");
        });
        let index = 0;
        this.loop = setInterval(()=>{
            index = ++index % this.docs.length;
            this.dispatchEvent(new CustomEvent("select", {
                detail: {document: this.docs[index].root, auto: true}
            }));
        }, 360/0.01) as any;
     }
     
     disconnected(): void {
        console.log("Disconnect menu")
        clearInterval(this.loop);
     }
 
     protected renderEntry(object: IDocumentParams, index: number)
     {
        return html`<a class="object-menu-card" @click=${()=>this.onClickObject(object, index)}>
            <img src=${object.thumbnail} />
            <div class="object-menu-header">
                <h1>${object.title}</h1>
                <p>${object.caption}</p>
            </div>
        </a>`;
     }
 
     protected render()
     {
        if(!this.docs)
        {
            return html`Chargement...`;
        }
        return html`<div class="split-mode-object-menu ff-scroll-y">
            ${this.docs.map((obj, index) => this.renderEntry(obj, index))}
        </div>`;
     }
 
     protected onClickObject = (document: IDocumentParams, index: number)=>{
        clearInterval(this.loop);
        this.dispatchEvent(new CustomEvent("select", {
            detail: {document: document.root, route: "scene", auto: true}
        }));
     }
 }