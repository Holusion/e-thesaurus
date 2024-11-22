import { customElement, html, LitElement, property } from "lit-element";
import i18n from "../state/translate";


@customElement("history-version-card")
export default class HistoryVersion extends i18n(LitElement){

  @property({type: Array, attribute: false})
  names :string[];

  @property({type:Array, attribute: false})
  authors :string[];

  @property({type:Number, attribute: false})
  time :number;

  @property({type: Boolean, attribute: true})
  current :boolean = false;

  protected render(){
    
    let name = (3 < this.names.length)? html`${this.names[0]} <span style="text-decoration:underline; cursor:pointer">${this.t("info.etAl", {count:this.names.length})}</span>`
    : this.names.join(", ");

    let authors = this.authors.join(", ")

    return html`
      <div class="list-item">
        <div style="flex: 1 0 6rem;overflow: hidden;text-overflow: ellipsis">
          <div class="tooltip" style="margin-bottom:5px;" >
            <a @click=${(e)=>e.target.parentNode.classList.toggle("visible")} class="caret" style="cursor: pointer;">
              ${name}
            </a>
            <div><ul style="opacity:0.7">${[...v.entries].map((n, index)=>{
              return html`<li>${n.name} ${n.mime != "text/directory"? html`(${n.size?html`<b-size b=${n.size}></b-size>`:"DELETED"})`:null}</li>`
            })}</ul></div>
          </div>
          
          <div style=""><b>${authors}</b> <span style="opacity:0.6; font-size: smaller">${new Date(this.time).toLocaleString(this.language)}</span></div>
        </div>

        ${this.current?html`<ui-button class="btn-main" style="flex:initial; height:fit-content;" title="restore" @click=${this.onRestore}</ui-button>`: html`<ui-button disabled transparent text="active">active</ui-button>`}
      </div>
    `
  }

  onRestore = (e:MouseEvent)=>{
    this.dispatchEvent(new CustomEvent("restore", {detail: this}));
  }
}