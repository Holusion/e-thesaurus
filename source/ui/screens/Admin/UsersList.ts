
import { customElement, property, html, TemplateResult, LitElement, css } from "lit-element";

import "../../composants/Spinner";
import Modal from "../../composants/Modal";
import "../../composants/SceneCard";
import HttpError from "../../state/HttpError";
import "../../composants/Icon";
import { nothing } from "lit-html";
import Notification from "../../composants/Notification";
import i18n from "../../state/translate";

import commonStyles from '!lit-css-loader?{"specifier":"lit-element"}!sass-loader!../../styles/common.scss';
import tableStyles from '!lit-css-loader?{"specifier":"lit-element"}!sass-loader!../../styles/tables.scss';

interface User {
    uid :string;
    username :string;
    isAdministrator :boolean;
}

/**
 * Main UI view for the Voyager Explorer application.
 */
 @customElement("users-list")
 export default class UsersScreen extends i18n(LitElement)
 {
    @property({type: Array})
    list : User[];

    @property({attribute: false, type: Boolean})
    loading =true;

    @property({attribute: false, type: Object})
    error :Error;

    constructor()
    {
        super();
    }
      
    public connectedCallback(): void {
        super.connectedCallback();
        this.fetchUsers();
    }
    
    fetchUsers() : void{
        this.loading = true;
        fetch("/users")
        .then(HttpError.okOrThrow)
        .then(async (r)=>{
            this.list = await r.json();
        }).catch((e)=>{
            console.error(e);
            this.error = e;
        })
        .finally(()=> this.loading = false);
    }
    onCreateUser = (ev :MouseEvent)=>{
        ev.preventDefault();
        const username = ev.target["username"].value;
        const email = ev.target["email"].value;
        const password = ev.target["password"].value;
        const isAdministrator = ev.target["isAdministrator"].checked;
        (ev.target as HTMLFormElement).reset();
        Modal.close();
        console.log("create user : ", username, password, isAdministrator, email);
        fetch("/users", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({username, password, isAdministrator, email})
        }).then(HttpError.okOrThrow)
        .then(()=>this.fetchUsers())
        .catch(e=>{
            console.error(e);
            Modal.show({
                header: this.t("error.createUser"),
                body: "Message : "+e.message,
            });
        });
    }
    onDeleteUser = (ev :MouseEvent, u :User)=>{
        ev.preventDefault();
        fetch(`/users/${u.uid}`, {
            headers: {"Content-Type": "application/json"},
            method: "DELETE"
        }).then(HttpError.okOrThrow)
        .then(()=>this.fetchUsers())
        .then(()=>Notification.show(`User ${u.username} Deleted`, "info"))
        .catch(e=>{
            console.error(e);
            Modal.show({
                header: "Error deleting user",
                body: "Message : "+e.message,
            });
        });
        Modal.close();
    }

    deleteUserOpen(u :User){
        Modal.show({
            header: "Delete user",
            body: html`<div>${this.t("info.userDeleteConfirm", {username : u.username})}</div>`,
            buttons: html`<div style="display:flex;padding-top:30px;">
                <ui-button class="btn-main" text="cancel" @click=${Modal.close}></ui-button>
                <ui-button class="btn-danger" text="delete" @click=${(ev)=>this.onDeleteUser(ev, u)}><ui-button>
            </div>`
        });
    }

    createUserOpen(){
        Modal.show({
            header: this.t("ui.createUser"),
            body: html`<form id="userlogin" autocomplete="off" class="form-control form-modal" @submit=${this.onCreateUser}>
                <div class="form-item">
                    <input type="text" name="username" id="username" autocomplete="off" placeholder=${this.t("ui.username")} required>
                    <label for="username">${this.t("ui.username")}</label>
                </div>
                <div class="form-group">
                    <div class="form-item">
                        <input type="email" name="email" id="email" placeholder=${this.t("ui.email")} required>
                        <label for="email">${this.t("ui.email")}</label>
                    </div>
                </div>
                <div class="form-item">
                    <input type="password" name="password" id="password" autocomplete="new-password" placeholder=${this.t("ui.password")} required>
                    <label for="password">${this.t("ui.password")}</label>
                </div>
            </div>
                <div class="form-group">
                    <div class="form-checkbox">
                        <input type="checkbox" name="isAdministrator" id="isAdministrator">
                        <label for="isAdministrator">${this.t("ui.isAdministrator")}</label>
                    </div>
                </div>
                <div class="form-item" style="margin-top: 15px">
                    <input type="submit" value=${this.t("ui.create")} >
                </div>
            </form>`,
          });
    }

    protected render() :TemplateResult {
        if(this.error){
            return html`<h2>Error</h2><div>${this.error.message}</div>`;
        }else if(this.loading){
            return html`<div style="margin-top:10vh"><spin-loader visible></spin-loader></div>`
        }
        return html`<div>
            <h1>${this.t("info.userManager")}</h2>
            <ui-button style="max-width: 200px; margin-bottom: 15px" class="btn-main" icon="plus" text=${this.t("ui.createUser")} @click=${this.createUserOpen}></ui-button>
            <div class="users-list section" style="position:relative;">
                <table class="list-table">
                    <thead><tr>
                        <th>uid</th>
                        <th>${this.t("ui.username")}</th>
                        <th>
                            admin?
                        </th>
                        <th>

                        </th>
                    </tr></thead>
                    <tbody>
                    ${(!this.list?.length)?html`<tr><td colspan=4 style="text-align: center;">No user registered. Click the <ui-icon name="plus"></ui-icon> to add one</td</tr>`:nothing}
                    ${this.list.map(u=>html`<tr>
                        <td style="font-family:monospace;">${u.uid}</td>
                        <td>${u.username}</td>
                        <td><input style="width:20px; height:20px" type="checkbox" .checked=${u.isAdministrator} disabled></td>
                        <td>
                            <div style="display:flex; justify-content:end;gap:.6rem;">
                            <ui-button style=${u.isAdministrator ? "color:var(--color-text);opacity:0.2":"color:var(--color-error)"} inline transparent icon="trash" title=${this.t("ui.delete")} @click=${()=>this.deleteUserOpen(u)} ?disabled=${u.isAdministrator}></ui-button>
                            <ui-button style="color:var(--color-dark)" inline transparent icon="key" title="login link" @click=${()=>this.createLoginLink(u)}></ui-button>
                            </div>
                        </td>
                    </tr>`)}
                    </tbody>
                </table>
            </div>
        </div>`;
    }
    createLoginLink(u :User){
        fetch(`/auth/login/${u.username}/link`, {
            method: "GET",
            headers: {
                "Content-Type": "text/plain"
            },
        }).then(async r=>{
            if(!r.ok) throw new Error(`[${r.status}] ${r.statusText}`);
            await navigator.clipboard.writeText(await r.text());
            Notification.show("Login link copied to clipboard", "info");
        }).catch(e=>{
            console.error(e);
            return Notification.show(`Failed to create login link : ${e.message}`, "error");
        })
    }
    static readonly styles = [commonStyles, tableStyles];
 }