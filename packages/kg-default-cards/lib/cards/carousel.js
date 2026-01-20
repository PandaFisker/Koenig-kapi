const {
    isLocalContentImage,
    setSrcsetAttribute,
    resizeImage
} = require('../utils');

const {
    absoluteToRelative,
    relativeToAbsolute,
    htmlAbsoluteToRelative,
    htmlRelativeToAbsolute,
    htmlToTransformReady,
    toTransformReady
} = require('@tryghost/url-utils/lib/utils');

/**
 * <figure class="kg-card kg-carousel-card kg-width-wide">
 *   <div class="kg-carousel-container">
 *     <div class="kg-carousel-item">
 *        <img ...>
 *     </div>
 *     <div class="kg-carousel-item">
 *        <video ...></video>
 *     </div>
 *   </div>
 *   <figcaption></figcaption>
 * </figure>
 */

module.exports = {
    name: 'carousel',
    type: 'dom',

    render({payload, env: {dom}, options = {}}) {
        const items = Array.isArray(payload.items) ? payload.items : [];

        const validItems = items.filter((item) => {
            if (!item || typeof item !== 'object') {
                return false;
            }

            if (item.type === 'video') {
                return !!item.src;
            }

            // default to image
            return !!(item.fileName && item.src && item.width && item.height);
        });

        if (validItems.length === 0) {
            return dom.createTextNode('');
        }

        const figure = dom.createElement('figure');
        figure.setAttribute('class', 'kg-card kg-carousel-card kg-width-wide');

        const container = dom.createElement('div');
        container.setAttribute('class', 'kg-carousel-container');
        figure.appendChild(container);

        validItems.forEach((item) => {
            const itemDiv = dom.createElement('div');
            itemDiv.setAttribute('class', 'kg-carousel-item');

            if (item.type === 'video') {
                const video = dom.createElement('video');
                video.setAttribute('src', item.src);
                video.setAttribute('controls', '');
                video.setAttribute('playsinline', '');
                video.setAttribute('preload', 'metadata');

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
                container.appendChild(itemDiv);
                return;
            }

            const img = dom.createElement('img');
            img.setAttribute('src', item.src);
            img.setAttribute('width', item.width);
            img.setAttribute('height', item.height);
            img.setAttribute('loading', 'lazy');
            img.setAttribute('alt', item.alt || '');
            if (item.title) {
                img.setAttribute('title', item.title);
            }

            // optionally cap output width/height for transformed images
            const {canTransformImage} = options;
            const {defaultMaxWidth} = options.imageOptimization || {};
            if (
                defaultMaxWidth &&
                item.width > defaultMaxWidth &&
                isLocalContentImage(item.src, options.siteUrl) &&
                canTransformImage &&
                canTransformImage(item.src)
            ) {
                const {width, height} = resizeImage(item, {width: defaultMaxWidth});
                img.setAttribute('width', width);
                img.setAttribute('height', height);
            }

            if (options.target !== 'email') {
                setSrcsetAttribute(img, item, options);

                if (img.getAttribute('srcset')) {
                    if (item.width >= 1200) {
                        img.setAttribute('sizes', '(min-width: 1200px) 1200px');
                    } else if (item.width >= 720) {
                        img.setAttribute('sizes', '(min-width: 720px) 720px');
                    }
                }
            }

            if (item.href) {
                const a = dom.createElement('a');
                a.setAttribute('href', item.href);
                a.appendChild(img);
                itemDiv.appendChild(a);
            } else {
                itemDiv.appendChild(img);
            }

            container.appendChild(itemDiv);
        });

        // Controls: arrows + dots (structure only; consumers can attach behaviour)
        if (validItems.length > 1 && options.target !== 'email') {
            const controls = dom.createElement('div');
            controls.setAttribute('class', 'kg-carousel-controls');

            // Use non-form elements for maximum compatibility with downstream HTML sanitizers
            const arrowPrev = dom.createElement('div');
            arrowPrev.setAttribute('class', 'kg-carousel-arrow kg-carousel-arrow-prev');
            arrowPrev.setAttribute('data-kg-carousel-prev', '');

            const arrowNext = dom.createElement('div');
            arrowNext.setAttribute('class', 'kg-carousel-arrow kg-carousel-arrow-next');
            arrowNext.setAttribute('data-kg-carousel-next', '');

            const dots = dom.createElement('div');
            dots.setAttribute('class', 'kg-carousel-dots');
            dots.setAttribute('data-kg-carousel-dots', '');

            validItems.forEach((_, index) => {
                const dot = dom.createElement('div');
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

        if (payload.caption) {
            const figcaption = dom.createElement('figcaption');
            figcaption.appendChild(dom.createRawHTMLSection(payload.caption));
            figure.appendChild(figcaption);
            figure.setAttribute('class', `${figure.getAttribute('class')} kg-card-hascaption`);
        }

        return figure;
    },

    absoluteToRelative(payload, options) {
        if (payload.items) {
            payload.items.forEach((item) => {
                item.src = item.src && absoluteToRelative(item.src, options.siteUrl, options);
                item.thumbnailSrc = item.thumbnailSrc && absoluteToRelative(item.thumbnailSrc, options.siteUrl, options);
                item.customThumbnailSrc = item.customThumbnailSrc && absoluteToRelative(item.customThumbnailSrc, options.siteUrl, options);
                item.caption = item.caption && htmlAbsoluteToRelative(item.caption, options.siteUrl, options);
            });
        }

        payload.caption = payload.caption && htmlAbsoluteToRelative(payload.caption, options.siteUrl, options);

        return payload;
    },

    relativeToAbsolute(payload, options) {
        if (payload.items) {
            payload.items.forEach((item) => {
                item.src = item.src && relativeToAbsolute(item.src, options.siteUrl, options.itemUrl, options);
                item.thumbnailSrc = item.thumbnailSrc && relativeToAbsolute(item.thumbnailSrc, options.siteUrl, options.itemUrl, options);
                item.customThumbnailSrc = item.customThumbnailSrc && relativeToAbsolute(item.customThumbnailSrc, options.siteUrl, options.itemUrl, options);
                item.caption = item.caption && htmlRelativeToAbsolute(item.caption, options.siteUrl, options.itemUrl, options);
            });
        }

        payload.caption = payload.caption && htmlRelativeToAbsolute(payload.caption, options.siteUrl, options.itemUrl, options);

        return payload;
    },

    toTransformReady(payload, options) {
        if (payload.items) {
            payload.items.forEach((item) => {
                item.src = item.src && toTransformReady(item.src, options.siteUrl, options);
                item.thumbnailSrc = item.thumbnailSrc && toTransformReady(item.thumbnailSrc, options.siteUrl, options);
                item.customThumbnailSrc = item.customThumbnailSrc && toTransformReady(item.customThumbnailSrc, options.siteUrl, options);
                item.caption = item.caption && htmlToTransformReady(item.caption, options.siteUrl, options);
            });
        }

        payload.caption = payload.caption && htmlToTransformReady(payload.caption, options.siteUrl, options);

        return payload;
    }
};
