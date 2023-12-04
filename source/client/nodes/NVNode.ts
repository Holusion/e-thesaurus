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

import Component from "@ff/graph/Component";
import Node from "@ff/graph/Node";

import { IDocument } from "client/schema/document";

import CVNode from "../components/CVNode";

import CVCamera from "../components/CVCamera";
import { ICVLight, CLight } from "../components/CVLight";
import CVDirectionalLight from "../components/CVDirectionalLight";
import CVPointLight from "../components/CVPointLight";
import CVSpotLight from "../components/CVSpotLight";

import CVMeta from "../components/CVMeta";
import CVModel2 from "../components/CVModel2";
import CVScene from "../components/CVScene";

////////////////////////////////////////////////////////////////////////////////

export interface INodeComponents
{
    meta?: boolean; // meta data
    setup?: boolean; // scene setup
    model?: boolean; // models
    camera?: boolean; // cameras
    light?: boolean; // lights
}


export default class NVNode extends Node
{
    static readonly typeName: string = "NVNode";

    get transform() {
        return this.components.get(CVNode);
    }
    get meta() {
        return this.components.get(CVMeta, true);
    }
    get model() {
        return this.components.get(CVModel2, true);
    }
    get camera() {
        return this.components.get(CVCamera, true);
    }
    get light() {
        return this.components.get(CLight, true) as ICVLight;
    }
    get scene() {
        return this.components.get(CVScene, true);
    }

    createComponents()
    {
        this.name = "Node";
        this.createComponent(CVNode);
    }

    createModel()
    {
        this.name = "Model";
        this.createComponent(CVMeta);
        this.createComponent(CVModel2);
    }

    fromDocument(document: IDocument, nodeIndex: number,  pathMap: Map<string, Component>)
    {
        const node = document.nodes[nodeIndex];
        this.transform.fromData(node);

        pathMap.set(`node/${nodeIndex}`, this.transform);

        let name = "Node";

        if (isFinite(node.meta)) {
           this.createComponent(CVMeta).fromDocument(document, node);
            pathMap.set(`meta/${node.meta}`, this.meta);
            name = "Meta";
        }
        if (isFinite(node.model)) {
            this.createComponent(CVModel2).fromDocument(document, node);
            pathMap.set(`model/${node.model}`, this.model);
            name = "Model";
        }
        if (isFinite(node.camera)) {
            this.createComponent(CVCamera).fromDocument(document, node);
            pathMap.set(`camera/${node.camera}`, this.camera);
            name = "Camera";
        }
        if (isFinite(node.light)) {
            const type = document.lights[node.light].type;
            switch (type) {
                case "directional":
                    this.createComponent(CVDirectionalLight).fromDocument(document, node);
                    name = "Directional Light";
                    break;
                case "point":
                    this.createComponent(CVPointLight).fromDocument(document, node);
                    name = "Point Light";
                    break;
                case "spot":
                    this.createComponent(CVSpotLight).fromDocument(document, node);
                    name = "Spot Light";
                    break;
                default:
                    throw new Error(`unknown light type: '${type}'`);
            }

            pathMap.set(`light/${node.light}`, this.light);
        }

        this.name = node.name || name;

        const childIndices = node.children;
        if (childIndices) {
            childIndices.forEach(childIndex => {
                const childNode = this.graph.createCustomNode(NVNode);
                this.transform.addChild(childNode.transform);
                childNode.fromDocument(document, childIndex, pathMap);
            });
        }
    }

    toDocument(document: IDocument, pathMap: Map<Component, string>, components?: INodeComponents)
    {
        components = components || {
            meta: true,
            setup: true,
            model: true,
            camera: true,
            light: true,
        };

        document.nodes = document.nodes || [];
        const nodeIndex = document.nodes.length;
        const node = ((this.camera)? {} : this.transform.toData());
        document.nodes.push(node);

        pathMap.set(this.transform, `node/${nodeIndex}`);

        if (this.name) {
            node.name = this.name;
        }

        if (this.model && components.model) {
            node.model = this.model.toDocument(document, node);
            pathMap.set(this.model, `model/${node.model}`);
        }
        if (this.camera && components.camera) {
            node.camera = this.camera.toDocument(document, node);
            pathMap.set(this.camera, `camera/${node.camera}`);
        }
        if (this.light && components.light) {
            node.light = this.light.toDocument(document, node);
            pathMap.set(this.light, `light/${node.light}`);
        }
        if (this.meta && components.meta) {
            node.meta = this.meta.toDocument(document, node);
            pathMap.set(this.meta, `info/${node.meta}`);
        }

        const children = this.transform.children
            .map(child => child.node).filter(node => node.is(NVNode)) as NVNode[];

        children.forEach(child => {
            if (child.hasNodeComponents(components)) {
                const index = child.toDocument(document, pathMap, components);
                node.children = node.children || [];
                node.children.push(index);
            }
        });

        return nodeIndex;
    }

    hasNodeComponents(components: INodeComponents)
    {
        if (!components) {
            return true;
        }

        const tf = this.transform;
        const comps = this.components;

        if (components.model && (comps.has(CVModel2) || tf.hasChildComponents(CVModel2, true))) {
            return true;
        }
        if (components.camera && (comps.has(CVCamera) || tf.hasChildComponents(CVCamera, true))) {
            return true;
        }
        if (components.light && (comps.has(CLight) || tf.hasChildComponents(CLight, true))) {
            return true;
        }

        return false;
    }
}