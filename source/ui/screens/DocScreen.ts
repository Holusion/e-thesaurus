
import { customElement, property, html, TemplateResult, LitElement, css } from "lit-element";
import {unsafeHTML} from 'lit-html/directives/unsafe-html.js';

import "@ff/ui/Button";
import Icon from "@ff/ui/Icon";

import "client/ui/Spinner";
import { route, router } from "../state/router";

import "../composants/DocView";
/**
 * Main UI view for the Voyager Explorer application.
 */
Icon.add("share", html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M352 320c-22.608 0-43.387 7.819-59.79 20.895l-102.486-64.054a96.551 96.551 0 0 0 0-41.683l102.486-64.054C308.613 184.181 329.392 192 352 192c53.019 0 96-42.981 96-96S405.019 0 352 0s-96 42.981-96 96c0 7.158.79 14.13 2.276 20.841L155.79 180.895C139.387 167.819 118.608 160 96 160c-53.019 0-96 42.981-96 96s42.981 96 96 96c22.608 0 43.387-7.819 59.79-20.895l102.486 64.054A96.301 96.301 0 0 0 256 416c0 53.019 42.981 96 96 96s96-42.981 96-96-42.981-96-96-96z"/></svg>`);
Icon.add("expand", html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><path d="M241,29V141.53a14,14,0,0,1-14,14h-18.7a14,14,0,0,1-14-14V61.74H114.45a14,14,0,0,1-14-14L100.3,29a14,14,0,0,1,14-14H226.89A14,14,0,0,1,241,29Z"/><path class="cls-1" d="M15,226.67V114.11a14,14,0,0,1,14-14h18.7a14,14,0,0,1,14,14V193.9h79.79a14,14,0,0,1,14,14l.12,18.74a14,14,0,0,1-14,14H29.07A14,14,0,0,1,15,226.67Z"/></svg>`);
Icon.add("tools", html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M501.1 395.7L384 278.6c-23.1-23.1-57.6-27.6-85.4-13.9L192 158.1V96L64 0 0 64l96 128h62.1l106.6 106.6c-13.6 27.8-9.2 62.3 13.9 85.4l117.1 117.1c14.6 14.6 38.2 14.6 52.7 0l52.7-52.7c14.5-14.6 14.5-38.2 0-52.7zM331.7 225c28.3 0 54.9 11 74.9 31l19.4 19.4c15.8-6.9 30.8-16.5 43.8-29.5 37.1-37.1 49.7-89.3 37.9-136.7-2.2-9-13.5-12.1-20.1-5.5l-74.4 74.4-67.9-11.3L334 98.9l74.4-74.4c6.6-6.6 3.4-17.9-5.7-20.2-47.4-11.7-99.6.9-136.6 37.9-28.5 28.5-41.9 66.1-41.2 103.6l82.1 82.1c8.1-1.9 16.5-2.9 24.7-2.9zm-103.9 82l-56.7-56.7L18.7 402.8c-25 25-25 65.5 0 90.5s65.5 25 90.5 0l123.6-123.6c-7.6-19.9-9.9-41.6-5-62.7zM64 472c-13.2 0-24-10.8-24-24 0-13.3 10.7-24 24-24s24 10.7 24 24c0 13.2-10.7 24-24 24z"/></svg>`);
Icon.add("save", html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M433.941 129.941l-83.882-83.882A48 48 0 0 0 316.118 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h352c26.51 0 48-21.49 48-48V163.882a48 48 0 0 0-14.059-33.941zM224 416c-35.346 0-64-28.654-64-64 0-35.346 28.654-64 64-64s64 28.654 64 64c0 35.346-28.654 64-64 64zm96-304.52V212c0 6.627-5.373 12-12 12H76c-6.627 0-12-5.373-12-12V108c0-6.627 5.373-12 12-12h228.52c3.183 0 6.235 1.264 8.485 3.515l3.48 3.48A11.996 11.996 0 0 1 320 111.48z"/></svg>`);
Icon.add("download", html`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512"><path d="M216 236.07c0-6.63-5.37-12-12-12h-24c-6.63 0-12 5.37-12 12v84.01h-48.88c-10.71 0-16.05 12.97-8.45 20.52l72.31 71.77c4.99 4.95 13.04 4.95 18.03 0l72.31-71.77c7.6-7.54 2.26-20.52-8.45-20.52H216v-84.01zM369.83 97.98L285.94 14.1c-9-9-21.2-14.1-33.89-14.1H47.99C21.5.1 0 21.6 0 48.09v415.92C0 490.5 21.5 512 47.99 512h287.94c26.5 0 48.07-21.5 48.07-47.99V131.97c0-12.69-5.17-24.99-14.17-33.99zM255.95 51.99l76.09 76.08h-76.09V51.99zM336 464.01H47.99V48.09h159.97v103.98c0 13.3 10.7 23.99 24 23.99H336v287.95z"/></svg>`);

 @customElement("doc-screen")
 export default class DocScreen extends router(LitElement)
 {
  @route()
  static "/:name" = ({parent, params})=> html`<doc-view path="/${params.name.toLowerCase()}" ></doc-view>`;


  render(){
    return html`
      <h1>eCorpus documentation</h1>
      ${this.renderContent()}
    `;
  }
 }