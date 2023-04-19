
import { css, customElement, property, html, TemplateResult, LitElement } from "lit-element";
import Notification from "@ff/ui/Notification";

import "client/ui/Spinner";
import "../composants/UploadButton";
import "./LandingPage";
import "../composants/SceneCard";
import "../composants/ListItem";

import i18n from "../state/translate";
import { UserSession, withUser } from "../state/auth";
import { repeat } from "lit-html/directives/repeat";

import "../composants/TaskButton";
import { withScenes } from "../state/withScenes";
import { navigate } from "../state/router";


interface Scene{
    ctime :Date;
    mtime :Date;
    author_id :number;
    author :string;
    id :number;
    name :string;
    thumb ?:string;
}
interface Upload{
    name :string;
}

/**
 * Main UI view for the Voyager Explorer application.
 */
 @customElement("corpus-list")
 export default class List extends withScenes( withUser( i18n( LitElement )))
 {

    @property({type: Object})
    uploads :{[name :string]:{
        error ?:{code?:number,message:string},
        done :boolean,
        progress ?:number,
    }} = {};

    @property()
    dragover = false;

    @property({type: Array, attribute: false})
    selection = [];

    get isUser(){
        return (this.user && !this.user.isDefaultUser);
    }

    constructor()
    {
        super();
    }

    createRenderRoot() {
        return this;
    }
      
    public onLoginChange (u: UserSession|undefined){
        super.onLoginChange(u);
        this.fetchScenes();
    }

    upload(file :File){
        console.log("Upload File : ", file);
        let sceneName = file.name.split(".").slice(0,-1).join(".");
    
        const setError = ({code, message})=>{
            Notification.show(`Can't  create ${sceneName}: ${message}`, "error", 4000);
            delete this.uploads[sceneName];
            this.uploads = {...this.uploads};
        }
        const setProgress = (n)=>{
            this.uploads = {...this.uploads, [sceneName]: {...this.uploads[sceneName], progress: n}};
        }
        const setDone = ()=>{
            this.fetchScenes().then(()=>{
                delete this.uploads[sceneName];
                this.uploads = {...this.uploads};                
            });
        }

        this.uploads = {...this.uploads, [sceneName]: {progress:0, done: false}};
        (async ()=>{
            let xhr = new XMLHttpRequest();
            xhr.onload = function onUploadDone(){
                if(xhr.status != 201 /*created*/){
                    setError({code: xhr.status, message: xhr.statusText});
                }else{
                    Notification.show(sceneName+" uploaded", "info");
                    setTimeout(setDone, 0);
                }
            }
    
            xhr.upload.onprogress = function onUploadProgress(evt){
                if(evt.lengthComputable){
                    console.log("Progress : ", Math.floor(evt.loaded/evt.total*100));
                    setProgress(Math.floor(evt.loaded/evt.total*100));
                }else{
                    setProgress(0);
                }
            }
            xhr.onerror = function onUploadError(){
                setError({code: xhr.status, message: xhr.statusText});
            }
    
            xhr.open('POST', `/api/v1/scenes/${sceneName}`);
            xhr.send(file);
        })();
    }

    onSelectChange = (ev :Event)=>{
        let target = (ev.target as HTMLInputElement);
        let selected = target.checked;
        let name = target.name;
        this.selection = selected? [...this.selection, name] : this.selection.filter(n=>n !== name);
    }

    private renderScene(mode :string, scene:Scene|Upload){
        return html`<scene-card styleCard="list" 
            .mode=${mode} 
            name=${scene.name} 
            .thumb=${(scene as Scene).thumb} 
            mtime=${"mtime" in scene && new Date(scene.ctime).toLocaleString()}
            .onChange=${this.onSelectChange}
        />`
    }

    protected render() :TemplateResult {
        if(!this.isUser){
            return html`<landing-page></landing-page>`;
        }
        let mode = (this.user?"write":"read")
        if(!this.list){
            return html`<div style="margin-top:10vh"><sv-spinner visible/></div>`;
        }else if (this.list.length == 0 && Object.keys(this.uploads).length == 0){
            return html`<div style="padding-bottom:100px;padding-top:20px;position:relative;" class="list-grid" >
                <h1>No scenes available</h1>
                ${this.dragover ?html`<div class="drag-overlay">Drop item here</div>`:""}
            </div>`;
        }

        return html`
            <div class="toolbar section">
                <div class="list-tasks form-control">
                    <div class="form-item" style="display:flex">
                        <input type="search" id="model-search" placeholder=${this.t("ui.searchScene")}>
                        <button class="ff-button ff-control btn-primary" style="margin-top:0" type="submit"><ff-icon name="search"></ff-icon></button>
                    </div>
                    <h4>${this.t("ui.newScene")}</h4>
                    <upload-button class="ff-button ff-control btn-primary" style="padding:8px" @change=${this.onUploadBtnChange}>
                        ${this.t("ui.upload")}
                    </upload-button>
                    
                    <a class="ff-button ff-control btn-primary" href="/ui/standalone/?lang=${this.language.toUpperCase()}">${this.t("info.useStandalone")}</a>
                    
                    ${(this.selection.length)?html`
                    <h4>${this.t("ui.tools")}</h4>
                    <a class="ff-button ff-control btn-primary btn-icon" download href="/api/v1/scenes?${
                        this.selection.map(name=>`name=${encodeURIComponent(name)}`).join("&")
                        }&format=zip">
                        Download Zip
                    </a>`: null}
              
                </div>
            </div>
            <div class="list-grid list-items section">
                ${repeat([
                    ...this.list,
                    ...Object.keys(this.uploads).map(name=>({name})),
                ],({name})=>name , (scene)=>this.renderScene(mode, scene))}
                ${this.dragover ?html`<div class="drag-overlay">Drop item here</div>`:""}
            </div>`;
    }

    ondragenter = (ev)=>{
        ev.preventDefault();
    }
    ondragleave = ()=>{
        this.dragover = false;
    }
    ondragover = (ev)=>{
        ev.preventDefault()
        if(this.isUser) this.dragover = true;
    }
    ondrop = (ev)=>{
        ev.preventDefault();
        if(!this.isUser) return;

        this.dragover = false;
        for(let item of [...ev.dataTransfer.items]){
            
            let file = item.getAsFile();
            if( !/\.glb$/i.test(file.name) || item.kind !== "file"){
                Notification.show(`${file.name} is not valid. This method only accepts .glb files` , "error", 4000);
                continue;
            };
            this.upload(file)
        }
    }

    onUploadBtnChange = (ev)=>{
        ev.preventDefault();
        for(let file of [...ev.detail.files]){
            if( !/\.glb$/i.test(file.name)){
                Notification.show(`${file.name} is not valid. This method only accepts .glb files` , "error", 4000);
                continue;
            };
            this.upload(file)
        }
    }

 }