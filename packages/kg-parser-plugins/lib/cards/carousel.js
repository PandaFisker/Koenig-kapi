import {addFigCaptionToPayload, readImageAttributesFromNode} from '../helpers';

function readCarouselImageItemFromNode(imgNode) {
    const image = readImageAttributesFromNode(imgNode);

    image.type = 'image';
    image.fileName = image.src ? image.src.match(/[^/]*$/)?.[0] : undefined;

    return image;
}

function readCarouselVideoItemFromNode(videoNode) {
    const src = videoNode?.src;
    if (!src) {
        return null;
    }

    const fileName = src.match(/[^/]*$/)?.[0];

    const width = videoNode.getAttribute('width');
    const height = videoNode.getAttribute('height');

    const poster = videoNode.getAttribute('poster');

    return {
        type: 'video',
        src,
        fileName,
        width: width ? parseInt(width) : undefined,
        height: height ? parseInt(height) : undefined,
        loop: !!videoNode.loop,
        thumbnailSrc: poster || undefined
    };
}

export function fromKoenigCard(options) {
    return function kgCarouselCardToCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || node.tagName !== 'FIGURE') {
            return;
        }

        if (!node.className.match(/kg-carousel-card/)) {
            return;
        }

        const payload = {};
        const itemNodes = Array.from(node.querySelectorAll('.kg-carousel-container .kg-carousel-item'));

        payload.items = itemNodes.map((itemNode) => {
            const img = itemNode.querySelector('img');
            if (img) {
                return readCarouselImageItemFromNode(img);
            }

            const video = itemNode.querySelector('video');
            if (video) {
                return readCarouselVideoItemFromNode(video);
            }

            return null;
        }).filter(Boolean);

        addFigCaptionToPayload(node, payload, {options});

        const cardSection = builder.createCardSection('carousel', payload);
        addSection(cardSection);
        nodeFinished();
    };
}
