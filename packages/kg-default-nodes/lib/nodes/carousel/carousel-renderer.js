import {addCreateDocumentOption} from '../../utils/add-create-document-option';
import {getResizedImageDimensions} from '../../utils/get-resized-image-dimensions';
import {isLocalContentImage} from '../../utils/is-local-content-image';
import {setSrcsetAttribute} from '../../utils/srcset-attribute';
import {renderEmptyContainer} from '../../utils/render-empty-container';

function isValidImage(item) {
    return item.type === 'image'
        && item.fileName
        && item.src
        && item.width
        && item.height;
}

function isValidVideo(item) {
    return item.type === 'video'
        && item.src;
}

export function renderCarouselNode(node, options = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument();

    const validItems = (node.items || []).filter((item) => {
        return isValidImage(item) || isValidVideo(item);
    });

    if (!validItems.length) {
        return renderEmptyContainer(document);
    }

    const figure = document.createElement('figure');
    figure.setAttribute('class', 'kg-card kg-carousel-card kg-width-wide');

    const container = document.createElement('div');
    container.setAttribute('class', 'kg-carousel-container');
    figure.appendChild(container);

    validItems.forEach((item) => {
        const itemDiv = document.createElement('div');
        itemDiv.setAttribute('class', 'kg-carousel-item');

        if (item.type === 'image') {
            const img = document.createElement('img');
            img.setAttribute('src', item.src);
            img.setAttribute('width', item.width);
            img.setAttribute('height', item.height);
            img.setAttribute('loading', 'lazy');
            img.setAttribute('alt', item.alt || '');
            if (item.title) {
                img.setAttribute('title', item.title);
            }

            const {canTransformImage} = options;
            const {defaultMaxWidth} = options.imageOptimization || {};
            if (
                defaultMaxWidth &&
                item.width > defaultMaxWidth &&
                isLocalContentImage(item.src, options.siteUrl) &&
                canTransformImage &&
                canTransformImage(item.src)
            ) {
                const {width, height} = getResizedImageDimensions(item, {width: defaultMaxWidth});
                img.setAttribute('width', width);
                img.setAttribute('height', height);
            }

            if (options.target !== 'email') {
                setSrcsetAttribute(img, item, options);
                if (img.getAttribute('srcset') && item.width >= 720) {
                    img.setAttribute('sizes', '(min-width: 720px) 720px');
                }
            }

            if (item.href) {
                const a = document.createElement('a');
                a.setAttribute('href', item.href);
                a.appendChild(img);
                itemDiv.appendChild(a);
            } else {
                itemDiv.appendChild(img);
            }
        }

        if (item.type === 'video') {
            const video = document.createElement('video');
            video.setAttribute('src', item.src);
            video.setAttribute('playsinline', '');
            video.setAttribute('preload', 'metadata');
            video.setAttribute('controls', '');

            if (item.width) {
                video.setAttribute('width', item.width);
            }
            if (item.height) {
                video.setAttribute('height', item.height);
            }

            const poster = item.customThumbnailSrc || item.thumbnailSrc;
            if (poster) {
                video.setAttribute('poster', poster);
            }

            if (item.loop) {
                video.setAttribute('loop', '');
            }

            itemDiv.appendChild(video);
        }

        container.appendChild(itemDiv);
    });

    // Controls: arrows + dots (structure only; consumers can attach behaviour)
    if (validItems.length > 1 && options.target !== 'email') {
        const controls = document.createElement('div');
        controls.setAttribute('class', 'kg-carousel-controls');

        // Use non-form elements for maximum compatibility with downstream HTML sanitizers
        const arrowPrev = document.createElement('div');
        arrowPrev.setAttribute('class', 'kg-carousel-arrow kg-carousel-arrow-prev');
        arrowPrev.setAttribute('data-kg-carousel-prev', '');

        const arrowNext = document.createElement('div');
        arrowNext.setAttribute('class', 'kg-carousel-arrow kg-carousel-arrow-next');
        arrowNext.setAttribute('data-kg-carousel-next', '');

        const dots = document.createElement('div');
        dots.setAttribute('class', 'kg-carousel-dots');
        dots.setAttribute('data-kg-carousel-dots', '');

        validItems.forEach((_, index) => {
            const dot = document.createElement('div');
            dot.setAttribute('class', 'kg-carousel-dot');
            dot.setAttribute('data-kg-carousel-dot', '');
            dot.setAttribute('data-index', `${index}`);
            dots.appendChild(dot);
        });

        controls.appendChild(arrowPrev);
        controls.appendChild(arrowNext);
        controls.appendChild(dots);
        figure.appendChild(controls);
    }

    if (node.caption) {
        const figcaption = document.createElement('figcaption');
        figcaption.innerHTML = node.caption;
        figure.appendChild(figcaption);
        figure.setAttribute('class', `${figure.getAttribute('class')} kg-card-hascaption`);
    }

    return {element: figure};
}
