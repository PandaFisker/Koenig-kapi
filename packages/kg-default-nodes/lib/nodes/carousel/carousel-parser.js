import {readCaptionFromElement} from '../../utils/read-caption-from-element.js';
import {readImageAttributesFromElement} from '../../utils/read-image-attributes-from-element.js';

function getFileNameFromSrc(src = '') {
    try {
        return src.match(/[^/]*$/)?.[0] || '';
    } catch (e) {
        return '';
    }
}

function readCarouselItemFromElement(element) {
    // image slide
    const img = element.querySelector('img');
    if (img) {
        const image = readImageAttributesFromElement(img);
        image.fileName = image.fileName || getFileNameFromSrc(image.src);
        return {
            type: 'image',
            ...image
        };
    }

    // video slide
    const video = element.querySelector('video');
    if (video) {
        const src = video.getAttribute('src') || video.src || '';
        const width = video.getAttribute('width') ? parseInt(video.getAttribute('width'), 10) : (video.width || null);
        const height = video.getAttribute('height') ? parseInt(video.getAttribute('height'), 10) : (video.height || null);

        const poster = video.getAttribute('poster') || '';

        return {
            type: 'video',
            src,
            width: Number.isFinite(width) ? width : null,
            height: Number.isFinite(height) ? height : null,
            fileName: getFileNameFromSrc(src),
            thumbnailSrc: poster || '',
            loop: !!video.loop
        };
    }

    return null;
}

export function parseCarouselNode(CarouselNode) {
    return {
        figure: (nodeElem) => {
            if (!nodeElem.classList?.contains('kg-carousel-card')) {
                return null;
            }

            return {
                conversion(domNode) {
                    const payload = {};

                    // primary structure: .kg-carousel-container > .kg-carousel-item
                    const itemElements = Array.from(domNode.querySelectorAll('.kg-carousel-container .kg-carousel-item'));

                    payload.items = itemElements
                        .map(readCarouselItemFromElement)
                        .filter(Boolean);

                    payload.caption = readCaptionFromElement(domNode);

                    const node = new CarouselNode(payload);
                    return {node};
                },
                priority: 1
            };
        }
    };
}
