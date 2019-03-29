/**
 * 3D Foundation Project
 * Copyright 2018 Smithsonian Institution
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

import "../ui/PropertyBoolean";
import "../ui/PropertyOptions";
import "../ui/PropertySlider";

import CVSetup from "./CVSetup";
import CVSlicer from "./CVSlicer";

import CVTool, { customElement, html, ToolView } from "./CVTool";

////////////////////////////////////////////////////////////////////////////////

export default class CVSliceTool extends CVTool
{
    static readonly typeName: string = "CVSliceTool";

    static readonly text = "Slice";
    static readonly icon = "knife";

    createView()
    {
        return new SliceToolView(this);
    }
}

////////////////////////////////////////////////////////////////////////////////

@customElement("sv-slice-tool-view")
export class SliceToolView extends ToolView<CVSliceTool>
{
    protected firstConnected()
    {
        super.firstConnected();
        this.classList.add("sv-slice-tool-view");
    }

    protected render()
    {
        const scene = this.activeSetup;
        if (!scene) {
            return html``;
        }

        const slicer = scene.slicer;
        const enabled = slicer.ins.enabled;
        const axis = slicer.ins.axis;
        const position = slicer.ins.position;

        return html`<sv-property-boolean .property=${enabled} name="Slice Tool"></sv-property-boolean>
            <sv-property-options .property=${axis}></sv-property-options>
            <sv-property-slider .property=${position}></sv-property-slider>`;
    }

    protected onActiveSetup(previous: CVSetup, next: CVSetup)
    {
        if (previous) {
            previous.slicer.off("update", this.onUpdate, this);
        }
        if (next) {
            next.slicer.on("update", this.onUpdate, this);
        }
    }
}