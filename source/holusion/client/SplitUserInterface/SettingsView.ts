import DocumentView, { property, customElement, html } from "client/ui/explorer/DocumentView";
import { System } from "@ff/scene/ui/SystemView";
import CVViewer from "client/components/CVViewer";

@customElement("settings-view")
export default class SettingsView extends DocumentView 
{
  private files : Array<string>;
  
  @property({type: Boolean })
  isOpen: boolean = false;

  protected get viewer()
  {
      return this.system.getComponent(CVViewer, true);
  }
  
  constructor(system :System)
  {
      super(system);
  }

  protected firstConnected(): void 
  {
      this.classList.add("settings-view");
  }

  connectedCallback() {
    super.connectedCallback()

    fetch("/files/list").then(async (res)=>{
      if(!res.ok) throw new Error(`[${res.status}]: ${res.statusText}`);
      this.files = await res.json();
    })
  }


  protected render()
  {
    const filesList = this.files?
     html`${this.files.map(file=> html`<ff-button icon="file" text=${file}></ff-button>`)}`:
     html`Aucun fichier trouvé`;

    if(!this.isOpen){
      return html`<ff-button class="open-btn" @click=${this.onOpen} icon="cog"></ff-button>`
    }
    return html`<div class="settings">
      <ff-button class="open-btn" style="position:absolute; right:0; top:0" @click=${this.onClose} icon="close"></ff-button>
      <h1>Paramètres</h1>
      <h2>Télécharger mes scènes</h2>
      <div class="files-list">
        ${filesList}
      </div>
    </div>`;
  }

  onClose = ()=>{
    this.isOpen = false;
    this.classList.remove("visible")
  }
  onOpen = ()=>{
    this.isOpen = true;
    this.classList.add("visible")
  }

}