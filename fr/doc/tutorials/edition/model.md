---
title: Préparer un modèle 3D
rank: 2
---

## Les modèles 3D pris en charge par eCorpus.

Une scène eCorpus est initialisée par un modèle 3D au format GLTF Binary (abregé en .glb). Il s'agit d'une format de modèle 3D sufacique optimisé pour WebGL et une utilisation en ligne sur un navigateur internet.

Ce format est libre, il est défini par le Consotirum Khronos. Sa documentation est librement accessible sur la [page github du projet](https://github.com/KhronosGroup/glTF).

### Materiaux

Les modèles utilisent un système de PBR (*Physically Based Rendering*) permettant des rendus aussi photoréalistes que possible.

<img src="/assets/img/doc/gltf_maps.jpg" width="100%" alt="types de textures supportées sur gltf" />



#### Un modèle intègre les couches d'information suivantes : 

- **Base Color** : Couleurs de la surface du modèle. Cette information est primordiale et presque toujours générée dans les processus de numérisation 3D.

- **Metallic** :  Décrit si le modèle est métallique (métal poli ou mat) ou dielectrique (céramique, plastique, peinture, rouille...)

- **Roughness** : Décrit si la surface du modèle est lisse ou mat.

- **Baked Ambient Occlusion** : Accentue le contraste au niveau des interstices et des recoins.

- **Normal Map** : Décrit les micro-détails de surface sans entrainer de déformation de la géométrie de l'objet. Elle est souvent générée lors d'une simplification du maillage d'un modèle pour conserver les informations de géométrie fine perdues dans le processus.

- **Emissive** : Zone de l'objet emettant de la lumière.

*Astuce : Les trois textures de Metallic, Roughness et Ambient Occlusion partagent une seule et même image en utilisant les canaux R, V et B. Ainsi, utiliser une seule d'entre elles ou bien les 3 en même temps n'a pas pas d'influence sur le poids du fichier et ses performances.*

**Documentation complète** : [Tout savoir sur l'export GLTF sur Blender](https://docs.blender.org/manual/en/latest/addons/import_export/scene_gltf2.html)






## Tester un modèle 3D

**Modèle 3D** : Vous pouvez utiliser les modèles 3D en GLTF de démonstration sur [ce lien](https://github.com/KhronosGroup/glTF-Sample-Models)

Vous pouvez utiliser [ce modèle au format .glb](/assets/3d/DamagedHelmet.glb).

Vous n'avez pas de compte eCorpus ? Pas de soucis ! Le mode Stand Alone vous permet de tester vos modèles 3D sans avoir de compte sur une base eCorpus : 
\
[Cliquez ici pour accèder à la scène test Standalone](https://ecorpus.fr-scv.fr/ui/standalone)
\
Pour se faire, glisser simplement votre modèle en GLB dans la scène ci-dessus. L'object apparaitra dans le scène si l'importation a réussi.

Attention ! Cette scène ne peut pas être sauvegardé, tout changement réalisé sera perdu.

## Préparer un modèle 3D


### Prérequis : Blender

Pour éditer, transformer et exporter vos modèles 3D, Blender est le logiciel le plus adapté.

Libre et gratuit, vous pouvez le télécharger pour toute plateforme sur le site officiel : [blender.org](https://www.blender.org/).


### A partir d'un logiciel de CAO en STL

Le STL (stéréolithographie) est un format de fichiers 3D principalement destiné à l'impression 3D. Elle ne comporte pas d'information de couleur ou de texture comme elle ne sert pas dans ce contexte.

Les STL sont facilement généré par les logiciels de <span style="text-decoration: underline dotted; cursor: help;" title="Conception Assisté par Ordinateur">CAO</span> tel que SolidWorks, AutoCAD ou FreeCAD.

*Tutoriel à venir: concevoir un modèle 3D sur le logiciel Fusion360*

#### Sur Blender
Blender est un logiciel d'édition 3D gratuit que vous pouvez utiliser pour importer vos modèles afin de les exporter en GLB.
<img src="/assets/img/doc/ExportSTLtoGLB_01.jpg" width ="500" height="500" alt="illustration models" />
\
Tout d'abord, veuillez Importer votre fichier STL grâce au bouton d'import STL présent dans le menu d'import de Blender.
<img src="/assets/img/doc/ExportSTLtoGLB_02.jpg" width ="500" height="500" alt="illustration models"/>
\
Une fois votre modèle importé, vous pouvez l'exporter via le bouton d'Export en GLB présent dans Blender.
<img src="/assets/img/doc/ExportGLB_00.jpg" width ="400" height="1000" alt="illustration models"/>
\
Voici les paramètres recommandés pour vos exports en GLB. 

Tout d'abord, nous vous conseillons de cocher la case "Selected Object Only" pour être sûr de n'exporter que l'objet selectionné.
\
Ensuite, dans "Data" et "Material" selectionnez le format "WebP" en compression 90 pour les textures.
\
Ensuite, cochez la case "Compression" pour alléger encore plus votre modèle si vous le souhaitez. Attention, une trop fort compression peut être à l'origine d'artefacts et d'erreur sur votre modèle ! Si c'est le cas, changez les paramètre ou n'utilisez pas la compression.

### A partir d'une numérisation 3D en OBJ

Tutoriel à venir: numériser avec votre smartphone

#### Sur Blender
Blender est un logiciel d'édition 3D gratuit que vous pouvez utiliser pour importer vos modèles afin de les exporter en GLB.
<img src="/assets/img/doc/ExportOBJtoGLB_01.jpg" width ="500" height="500" alt="illustration models"/>
\
Tout d'abord, veuillez Importer votre fichier OBJ grâce au bouton d'importer OBJ présent dans Blender.
<img src="/assets/img/doc/ExportSTLtoGLB_02.jpg" width ="500" height="500"alt="illustration models"/>
\
Une fois votre modèle importé, vous pouvez l'exporter via le bouton d'Export en GLB présent dans Blender.
<img src="/assets/img/doc/ExportGLB_00.jpg" width ="400" height="1000" alt="illustration models"/>
\
Voici les paramètres recommandés pour vos exports en GLB. 

Tout d'abord, nous vous conseillons de cocher la case "Selected Object Only" pour être sûr de n'exporter que l'objet selectionné.
\
Ensuite, dans "Data" et "Material" selectionnez le format "WebP" en compression 90 pour les textures.
\
Ensuite, cochez la case "Compression" pour alléger encore plus votre modèle.


### A partir d'un nuage de point PLY

#### Sur Blender
Blender est un logiciel d'édition 3D gratuit que vous pouvez utiliser pour importer vos modèles afin de les exporter en GLB.
<img src="/assets/img/doc/ExportPLYtoGLB_01.jpg" width ="500" height="500" alt="illustration models"/>
\
Tout d'abord, veuillez Importer votre fichier PLY grâce au bouton d'importer PLY présent dans Blender.
<img src="/assets/img/doc/ExportSTLtoGLB_02.jpg" width ="500" height="500"alt="illustration models"/>
\
Une fois votre modèle importé, vous pouvez l'exporter via le bouton d'Export en GLB présent dans Blender.
<img src="/assets/img/doc/ExportGLB_00.jpg" width ="400" height="1000" alt="illustration models"/>
\
Voici les paramètres recommandés pour vos exports en GLB. 

Tout d'abord, nous vous conseillons de cocher la case "Selected Object Only" pour être sûr de n'exporter que l'objet selectionné.
\
Ensuite, dans "Data" et "Material" selectionnez le format "WebP" en compression 90 pour les textures.
\
Ensuite, cochez la case "Compression" pour alléger encore plus votre modèle.


### Autres formats de fichier compatibles

#### FBX
Blender est un logiciel d'édition 3D gratuit que vous pouvez utiliser pour importer vos modèles afin de les exporter en GLB.
<img src="/assets/img/doc/ExportFBXtoGLB_01.jpg" width ="500" height="500" alt="illustration models"/>
\
Tout d'abord, veuillez Importer votre fichier FBX grâce au bouton d'importer FBX présent dans Blender.
<img src="/assets/img/doc/ExportSTLtoGLB_02.jpg" width ="500" height="500" alt="illustration models"/>
\
Une fois votre modèle importé, vous pouvez l'exporter via le bouton d'Export en GLB présent dans Blender.
<img src="/assets/img/doc/ExportGLB_00.jpg" width ="400" height="1000" alt="illustration models"/>
\
Voici les paramètres recommandés pour vos exports en GLB. 

Tout d'abord, nous vous conseillons de cocher la case "Selected Object Only" pour être sûr de n'exporter que l'objet selectionné.
\
Ensuite, dans "Data" et "Material" selectionnez le format "WebP" en compression 90 pour les textures.
\
Ensuite, cochez la case "Compression" pour alléger encore plus votre modèle.


#### DAE
Blender est un logiciel d'édition 3D gratuit que vous pouvez utiliser pour importer vos modèles afin de les exporter en GLB.
<img src="/assets/img/doc/ExportDAEtoGLB_01.jpg" width ="500" height="500" alt="illustration models"/>
\
Tout d'abord, veuillez Importer votre fichier DAE grâce au bouton d'importer DAE présent dans Blender.
<img src="/assets/img/doc/ExportSTLtoGLB_02.jpg" width ="500" height="500" alt="illustration models"/>
\
Une fois votre modèle importé, vous pouvez l'exporter via le bouton d'Export en GLB présent dans Blender.
<img src="/assets/img/doc/ExportGLB_00.jpg" width ="400" height="1000" alt="illustration models"/>
\
Voici les paramètres recommandés pour vos exports en GLB. 

Tout d'abord, nous vous conseillons de cocher la case "Selected Object Only" pour être sûr de n'exporter que l'objet selectionné.
\
Ensuite, dans "Data" et "Material" selectionnez le format "WebP" en compression 90 pour les textures.
\
Ensuite, cochez la case "Compression" pour alléger encore plus votre modèle.


#### USD*
Blender est un logiciel d'édition 3D gratuit que vous pouvez utiliser pour importer vos modèles afin de les exporter en GLB.
<img src="/assets/img/doc/ExportUSDtoGLB_01.jpg" width ="500" height="500" alt="illustration models"/>
\
Tout d'abord, veuillez Importer votre fichier USD* grâce au bouton d'importer USD* présent dans Blender.
<img src="/assets/img/doc/ExportSTLtoGLB_02.jpg" width ="500" height="500" alt="illustration models"/>
\
Une fois votre modèle importé, vous pouvez l'exporter via le bouton d'Export en GLB présent dans Blender.
<img src="/assets/img/doc/ExportGLB_00.jpg" width ="400" height="1000" alt="illustration models"/>
\
Voici les paramètres recommandés pour vos exports en GLB. 

Tout d'abord, nous vous conseillons de cocher la case "Selected Object Only" pour être sûr de n'exporter que l'objet selectionné.
\
Ensuite, dans "Data" et "Material" selectionnez le format "WebP" en compression 90 pour les textures.
\
Ensuite, cochez la case "Compression" pour alléger encore plus votre modèle.




## Charger un modèle 3D sur eCorpus.


## A vous de jouer

Intégration d'une scène eCorpus type

## Aller plus loin

Sommaire

## En savoir plus
Si vous souhaitez en apprendre plus sur les fonctionnalités d'eCorpus, vous pouvez vous rendre sur ce guide: <a href="import">Importer son modèle dans une scène eCorpus</a>.