
import { customElement, property, html, TemplateResult, LitElement, css } from "lit-element";

import "@ff/ui/Button";

import "./UsersList";
import i18n from "../../state/translate";
import Modal from "../../composants/Modal";

@customElement("send-testmail")
class TestmailModalBody extends i18n(LitElement){
  @property({type: String})
  state = "initial";

  protected render(): unknown {
    let onsend  = ()=>{
      this.state = "sending";
      fetch("/api/v1/admin/mailtest", {method: "POST"}).then(async (r)=>{
        let msg = await r.text();
        if(r.ok){
          this.state = "OK: "+msg;
        }else{
          throw new Error(msg);
        }
      }).catch(e =>{
        console.warn("Failed to send test email : ", e);
        this.state = "error: "+e.message;
      });
    }

    if(this.state =="initial"){
      return html`<div style="width:300px;display:flex;justify-content:center">
      <button @click=${onsend}>${this.t("ui.send")}</button>
      </div>`
    }else if(this.state === "sending"){
      return html`<div style="flex-grow:1">
        <progress style="width:100%"></progress>
      </div>`
    }else{
      return html`<div>
        <button @click=${onsend}>${this.t("ui.send")}</button>
        <p>${this.state}</p>
      </div>`;
    }
  }
}

/**
 * Main UI view for the Voyager Explorer application.
 */
@customElement("admin-home")
export default class AdminHomeScreen extends i18n(LitElement) {

  createRenderRoot() {
      return this;
  }
  
  protected render(): unknown {
    return html`
      <h2>${this.t("ui.adminSection")}</h2>

      <div class="section">
        <h3>${this.t("ui.tools")}</h3>
          <ul>
              <li>
                  <a  download href="/api/v1/scenes?format=zip">${this.t("ui.downloadZip")}</a>
              </li>
              <li>
                <a href="" @click=${(e)=>{
                  e.preventDefault();
                  Modal.show({
                    header: this.t("ui.sendTestMail"),
                    body: html`<send-testmail></send-testmail>`,
                  });
                }}>${this.t("ui.sendTestMail")}</a>
          </ul>
      </div>
    `;
  }
}