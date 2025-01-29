import { css, html, LitElement, PropertyValues, TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";

import "./Spinner";
import HttpError from "../state/HttpError";

@customElement("submit-fragment")
export default class SubmitFragment extends LitElement{
  /**
   * Route to call. Defaults to the value of `::slotted(form).action`.
   */
  @property({attribute: true, type: String})
  action ?:string;
  /**
   * Method to call with. Default to `::slotted(form).method`
   * Useful if method is not GET or POST
   */
  @property({attribute:true, type: String})
  method ?:string;

  /**
   * Content Encoding to use
   * Supports form-data or application/json 
   * If not provided, will default to "form.enctype" or "application/json"
   */
  @property({attribute: true, type: String})
  encoding ?:"application/x-www-form-urlencoded"|"application/json";

  /** Set `submit=".*"` to submit form on any change
   * Or set this to a list of comma-separated names that should trigger a submit on change
  */
  @property({attribute: "submit", type: String, converter:(value, type)=> value.split(",")})
  submit ?:string[];

  /**
   * Internal property to manage submission status
   */
  @property({attribute: true, reflect: true, type: Boolean})
  active:boolean = false;

  @state()
  status ?:{type:"status"|"alert", text :string|TemplateResult};

  #c?:AbortController;


  encode(f:HTMLFormElement, encoding:string):BodyInit{
    const data = new FormData(f);
    if(encoding === "application/x-www-form-urlencoded"){
      return data;
    }
    if(encoding !== "application/json"){
      throw new Error("Unsupported form encoding: "+encoding);
    }
    const values = Array.from(data.entries()).reduce((memo, [key, value]) => {
      let sr :FormDataEntryValue|FormDataEntryValue[];
      if(key in memo){
        sr = Array.isArray(memo[key])?[...memo[key], value]: [memo[key], value];
      }else{
        sr = value;
      }
      return { ...memo, [key]: sr};
    }, {});
    return JSON.stringify(values);
  }


  private async _do_submit(form:HTMLFormElement) :Promise<boolean>{
    this.#c?.abort();
    let c = this.#c = new AbortController();
    this.active = true;
    if(this.status) this.status = undefined;

    try{

      const action = this.action ?? form.action;
      const method = this.method ?? form.method;
      if(!action || !method) throw new Error(`Invalid request : [${method.toUpperCase()}] ${action}`)
      const encoding = this.encoding ?? form.enctype ?? form.encoding ?? "application/json";
      const body = this.encode(form, encoding);
      let res = await fetch(action, {
        method,
        body,
        signal: c.signal,
        headers: {
          "Content-Type": encoding,
          "Accept": "application/json",
        }
      });
      await HttpError.okOrThrow(res);

      this.active = false;
      this.status = {type:"status", text: `✓`};

      const t = setTimeout(()=> this.status = undefined, 5000);
      c.signal.addEventListener("abort", ()=>clearTimeout(t));
      return true;
    }catch(e){
      console.error("Request failed : ", e);
      this.active = false;
      this.status = {type:"alert", text:e.message};
      return false;
    }
  }

  handleSubmit = (e:SubmitEvent)=>{
    let form = e.target as HTMLFormElement;
    if(!(form instanceof HTMLFormElement)){
      console.warn("Bad submit event on", form);
      this.status = {type:"alert", text:"Unhandled form submit event"};
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    this._do_submit(form).then((success)=>{
      if(success) this.dispatchEvent(new CustomEvent("submit", {}));
    });
    return false;
  }

  handleChange = (e :Event)=>{
    const target = e.target as HTMLSelectElement|HTMLInputElement;
    if(!this.submit) return false;
    if(this.submit.indexOf(target.name) === -1) return false;
    if(!target.form) return console.warn("Element has no associated form : ", target);
    e.preventDefault();
    e.stopPropagation();
    this._do_submit(target.form);
  }

  protected update(changedProperties: PropertyValues): void {

    super.update(changedProperties);
  }

  protected render(): unknown {
    return html`
      <slot aria-busy="${this.active?"true":"false"}" @submit=${this.handleSubmit} @change=${this.handleChange}></slot>
      ${this.status? html`<span role="${this.status.type}" class="submit-${this.status.type === "alert"?"error":"success"}">${this.status.text}</span>`: null}
      ${this.active?html`<slot name="loader"><spin-loader aria-live="assertive" visible></spin-loader></slot>`:null}
    `;
  }
  static styles = css`
    :host(*){
      position: relative;
      display: block;
    }
    spin-loader{
      position: absolute;
      inset: 0;
    }
      
    :host([active]) ::slotted(form){
      user-select: none;
      pointer-events: none;
      opacity: 0.65;
    }

    .submit-error{
      display: block;
      text-align: center;
      color: var(--color-error);
    }
    .submit-success{
      color: var(--color-success);
    }
  `;
}