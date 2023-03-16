/**
 * 3D Foundation Project
 * Copyright 2019 Smithsonian Institution
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

import { customElement, property, html } from "@ff/ui/CustomElement";
import List from "@ff/ui/List";

import Derivative, { EDerivativeUsage, EDerivativeQuality} from "../../models/Derivative";

////////////////////////////////////////////////////////////////////////////////

export interface ISelectDerivativeEvent extends CustomEvent
{
    target: DerivativeList;
    detail: {
        derivative: Derivative;
    }
}

@customElement("sv-derivative-list")
class DerivativeList extends List<Derivative>
{
    @property({ attribute: false })
    selectedItem: Derivative = null;

    @property({ attribute: false })
    loadedItem: Derivative = null;

    protected firstConnected()
    {
        super.firstConnected();
        this.classList.add("sv-derivative-list");
    }

    protected renderItem(item: Derivative)
    {
        const isLoaded = item === this.loadedItem;
        return html`<div style="display:flex;justify-content:stretch;">
            <ff-icon name=${isLoaded ? "check" : "empty"}></ff-icon>
            <span title=${item.data.assets.map(a=>a.data.uri).join("\n")} style="flex: 1 1 auto;">${EDerivativeUsage[item.data.usage]} - ${EDerivativeQuality[item.data.quality]}</span>
            <ff-icon name="trash" @click=${(e)=>this.onRemoveItem(e, item)}></ff-icon>
        </div>`;
    }

    protected isItemSelected(item: Derivative)
    {
        return item === this.selectedItem;
    }

    protected onClickItem(event: MouseEvent, item: Derivative)
    {
        this.dispatchEvent(new CustomEvent("select", {
            detail: { derivative: item }
        }));
    }

    protected onRemoveItem(event :MouseEvent, item :Derivative){
        event.stopPropagation();
        this.dispatchEvent(new CustomEvent("remove", {
            detail: { derivative: item }
        }));
        return false;
    }

    protected onClickEmpty(event: MouseEvent)
    {
        this.dispatchEvent(new CustomEvent("select", {
            detail: { derivative: null }
        }));
    }
}