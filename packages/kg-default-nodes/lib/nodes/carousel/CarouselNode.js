/* eslint-disable ghost/filenames/match-exported-class */
import {generateDecoratorNode} from '../../generate-decorator-node';
import {parseCarouselNode} from './carousel-parser';
import {renderCarouselNode} from './carousel-renderer';

export class CarouselNode extends generateDecoratorNode({
    nodeType: 'carousel',
    properties: [
        {name: 'items', default: []},
        {name: 'caption', default: '', wordCount: true, urlType: 'html'}
    ],
    defaultRenderFn: renderCarouselNode
}) {
    /* override */
    static get urlTransformMap() {
        return {
            caption: 'html',
            items: {
                src: 'url',
                thumbnailSrc: 'url',
                customThumbnailSrc: 'url'
            }
        };
    }

    static importDOM() {
        return parseCarouselNode(this);
    }

    hasEditMode() {
        return false;
    }
}

export const $createCarouselNode = (dataset) => {
    return new CarouselNode(dataset);
};

export function $isCarouselNode(node) {
    return node instanceof CarouselNode;
}
