import CarouselCardIcon from '../../assets/icons/kg-card-type-carousel.svg?react';
import cleanBasicHtml from '@tryghost/kg-clean-basic-html';
import pick from 'lodash/pick';
import React from 'react';
import {$generateHtmlFromNodes} from '@lexical/html';
import {CarouselNode as BaseCarouselNode} from '@tryghost/kg-default-nodes';
import {CarouselNodeComponent} from './CarouselNodeComponent';
import {KoenigCardWrapper, MINIMAL_NODES} from '../../index.js';
import {createCommand} from 'lexical';
import {populateNestedEditor, setupNestedEditor} from '../../utils/nested-editors';

export const INSERT_CAROUSEL_COMMAND = createCommand();

export const MAX_ITEMS = 9;

const ALLOWED_IMAGE_ITEM_PROPS = ['type', 'src', 'width', 'height', 'alt', 'title', 'caption', 'fileName', 'href'];
const ALLOWED_VIDEO_ITEM_PROPS = ['type', 'src', 'width', 'height', 'duration', 'mimeType', 'fileName', 'thumbnailSrc', 'customThumbnailSrc', 'loop'];

function sanitizeCarouselItem(item) {
    if (!item || typeof item !== 'object') {
        return null;
    }

    if (item.type === 'video') {
        return pick(item, ALLOWED_VIDEO_ITEM_PROPS);
    }

    // default to image
    return pick(item, ALLOWED_IMAGE_ITEM_PROPS);
}

export class CarouselNode extends BaseCarouselNode {
    __triggerFileDialog = false;
    __initialFiles = null;
    __captionEditor;
    __captionEditorInitialState;

    static kgMenu = [{
        label: 'Carousel',
        desc: 'Create a media carousel',
        Icon: CarouselCardIcon,
        insertCommand: INSERT_CAROUSEL_COMMAND,
        insertParams: {
            triggerFileDialog: true
        },
        matches: ['carousel'],
        priority: 6,
        shortcut: '/carousel'
    }];

    // NOTE: drag/drop/paste routing currently assumes a single uploadType per card.
    // Carousel accepts mixed media; we intentionally omit uploadType for now.

    getIcon() {
        return CarouselCardIcon;
    }

    constructor(dataset = {}, key) {
        super(dataset, key);

        const {triggerFileDialog, initialFiles} = dataset;

        this.__triggerFileDialog = (!dataset.items || dataset.items.length === 0) && triggerFileDialog;
        this.__initialFiles = initialFiles || null;

        setupNestedEditor(this, '__captionEditor', {editor: dataset.captionEditor, nodes: MINIMAL_NODES});

        if (!dataset.captionEditor && dataset.caption) {
            populateNestedEditor(this, '__captionEditor', `${dataset.caption}`);
        }
    }

    set triggerFileDialog(shouldTrigger) {
        const writable = this.getWritable();
        writable.__triggerFileDialog = shouldTrigger;
    }

    getDataset() {
        const dataset = super.getDataset();

        const self = this.getLatest();
        dataset.captionEditor = self.__captionEditor;
        dataset.captionEditorInitialState = self.__captionEditorInitialState;

        return dataset;
    }

    exportJSON() {
        const json = super.exportJSON();

        if (this.__captionEditor) {
            this.__captionEditor.getEditorState().read(() => {
                const html = $generateHtmlFromNodes(this.__captionEditor, null);
                const cleanedHtml = cleanBasicHtml(html);
                json.caption = cleanedHtml;
            });
        }

        return json;
    }

    decorate() {
        return (
            <KoenigCardWrapper nodeKey={this.getKey()} width={'wide'}>
                <CarouselNodeComponent
                    captionEditor={this.__captionEditor}
                    captionEditorInitialState={this.__captionEditorInitialState}
                    initialFiles={this.__initialFiles}
                    nodeKey={this.getKey()}
                    triggerFileDialog={this.__triggerFileDialog}
                />
            </KoenigCardWrapper>
        );
    }

    setItems(items) {
        const sanitized = (items || [])
            .slice(0, MAX_ITEMS)
            .map(sanitizeCarouselItem)
            .filter(Boolean);

        this.items = sanitized;
    }

    addItems(items) {
        const merged = [...(this.items || []), ...(items || [])];
        this.setItems(merged);
    }
}

export const $createCarouselNode = (dataset) => {
    return new CarouselNode(dataset);
};

export function $isCarouselNode(node) {
    return node instanceof CarouselNode;
}
