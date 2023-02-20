
import { css, LitElement, customElement, property, html, TemplateResult } from "lit-element";

import Notification from "@ff/ui/Notification";
import "../Modal";
import Modal from "../Modal";
import "../UserLogin"
import Button from "@ff/ui/Button";
import { doLogout, setSession, UserSession } from "../../state/auth";
import i18n from "../../state/translate";

/**
 * Main UI view for the Voyager Explorer application.
 */
 @customElement("user-button")
 export default class UserMenu extends i18n(LitElement)
 {  
  createRenderRoot() {
    return this;
  }
    @property({type: Object})
    user :UserSession;
    
    constructor()
    {
        super();
    }

    onLoginOpen = ()=>{
      Modal.show({
        header: this.t("ui.login"),
        body: html`<user-login></user-login>`,
      });
    }


    onUserDataOpen = (ev :MouseEvent)=>{
      window.dispatchEvent(new CustomEvent("navigate", {detail: {href: "/ui/user/"}}));
    }

    protected render() :TemplateResult {
      if(!this.user?.username){
        return html`<ff-button style="height:100%" @click=${this.onLoginOpen} text=${this.t("ui.login")}></ff-button>`;
      }else{
        return html`<ff-button style="height:100%" @click=${this.onUserDataOpen} text=${this.user.username}></ff-button>`;
      }
    }

 
 }