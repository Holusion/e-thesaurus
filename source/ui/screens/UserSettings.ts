import { customElement, property, html, TemplateResult, LitElement, css } from "lit-element";
import Notification from "@ff/ui/Notification";
import { doLogout, setSession, withUser } from "../state/auth";
import i18n from "../state/translate";



@customElement("user-settings")
export default class UserSettings extends i18n(withUser(LitElement)) {
  createRenderRoot() {
      return this;
  }

  protected render() {
    if(!this.user){
      return html`<user-login></user-login>`;
    }
    return html`
      <form id="userlogin" class="form-control" @submit=${this.onChangeUserSubmit}>

        <div class="form-group">
          <h3>${this.t("ui.userSettings")}</h3>
        </div>
        <div class="form-group">
          <div class="form-item">
            <input type="text" name="username" id="username" placeholder="username" value="${this.user.username || ""}">
            <label for="username">${this.t("ui.username")}</label>
          </div>
        </div>
        <div class="form-group">
          <div class="form-item">
            <input type="email" name="email" id="email" placeholder="email" value="${this.user.email || ""}">
            <label for="email">${this.t("ui.email")}</label>
          </div>
        </div>
        <div class="form-group">
          <div class="form-item">
            <input type="submit" value="${this.t("ui.submit")}" >
          </div>
        </div>
      </form>

      <form id="userlogin" class="form-control" @submit=${this.onChangePasswordSubmit}>
        <div class="form-group">
          <h3>${this.t("ui.changePassword")}</h3>
        </div>
        <div class="form-group inline">
          <div class="form-item">
            <input type="password" name="password" id="password" placeholder="${this.t("ui.password")}" required>
            <label for="password">${this.t("ui.password")}</label>
          </div>
          <div class="divider"></div>
          <div class="form-item">
            <input type="password" name="password-confirm" id="password-confirm" placeholder="${this.t("ui.passwordConfirm")}" required>
            <label for="password-confirm">${this.t("ui.passwordConfirm")}</label>
          </div>
          <div class="divider"></div>
          <div class="form-item">
            <input type="submit" name="password-submit" value="${this.t("ui.changePassword")}">
          </div>
        </div>
      </form>

      <div style="padding-top:15px;">
        <ff-button text="${this.t("ui.logout")}" icon="cross" @click=${this.onLogout}></ff-button>
      </div>
    `;
  }

  onChangePasswordSubmit = (ev :MouseEvent)=>{
    ev.preventDefault();
    let form = ev.target as HTMLFormElement;
    if(form["password"].value != form["password-confirm"].value) return Notification.show("Passwords must match", "error");
    this.onChangeUserSubmit(ev);
  }

  onChangeUserSubmit = (ev :MouseEvent)=>{
    ev.preventDefault();
    let form = ev.target as HTMLFormElement;
    let patch = {};
    for(let key of ["email", "username", "password"]){
      if(!form[key]?.value ||  form[key]?.value === this.user[key]) continue;
      patch[key]= form[key].value;
    }
    if(!Object.keys(patch).length){
      return Notification.show("Nothing to change", "info");
    }
    fetch(`/api/v1/users/${this.user.uid}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(patch),
    }).then(async r=>{
      if(!r.ok) throw new Error(`[${r.status}] ${r.statusText}`);
      let user = await r.json();
      setSession(user);
      Notification.show("Done", "info");
    }).catch(e=>{
      console.error(e);
      Notification.show(`Save failed : ${e.message}`);
    });
  }

  onLogout = (ev :MouseEvent)=>{
    doLogout()
    .catch(e=>{
      Notification.show("Failed to logout "+ e.message, "error");
    });
  }
  static styles = []
}