const {createDocument, dom} = require('../test-utils');
const {$getRoot} = require('lexical');
const {createHeadlessEditor} = require('@lexical/headless');
const {$generateNodesFromDOM} = require('@lexical/html');
const {
    CarouselNode,
    $createCarouselNode,
    $isCarouselNode,
    ImageNode,
    VideoNode
} = require('../../');

const editorNodes = [CarouselNode, ImageNode, VideoNode];

describe('CarouselNode', function () {
    let editor;
    let dataset;
    let exportOptions;

    const editorTest = testFn => function (done) {
        editor.update(() => {
            try {
                testFn();
                done();
            } catch (e) {
                done(e);
            }
        });
    };

    beforeEach(function () {
        editor = createHeadlessEditor({nodes: editorNodes});

        dataset = {
            items: [
                {
                    type: 'image',
                    fileName: 'NatGeo01.jpg',
                    src: '/content/images/2018/08/NatGeo01-9.jpg',
                    width: 1600,
                    height: 900,
                    alt: 'Alt text'
                },
                {
                    type: 'video',
                    fileName: 'koenig-lexical.mp4',
                    src: '/content/images/2022/11/koenig-lexical.mp4',
                    width: 200,
                    height: 100,
                    thumbnailSrc: '/content/images/2022/11/koenig-lexical.jpg',
                    loop: true
                }
            ],
            caption: 'Test caption'
        };

        exportOptions = {
            dom,
            siteUrl: 'http://localhost:2368'
        };
    });

    it('matches node with $isCarouselNode', editorTest(function () {
        const node = $createCarouselNode(dataset);
        $isCarouselNode(node).should.be.true();
    }));

    describe('getType', function () {
        it('returns the correct node type', editorTest(function () {
            CarouselNode.getType().should.equal('carousel');
        }));
    });

    describe('urlTransformMap', function () {
        it('contains the expected URL mapping', editorTest(function () {
            CarouselNode.urlTransformMap.should.deepEqual({
                caption: 'html',
                items: {
                    src: 'url',
                    thumbnailSrc: 'url',
                    customThumbnailSrc: 'url'
                }
            });
        }));
    });

    describe('exportJSON', function () {
        it('contains all data', editorTest(function () {
            const node = $createCarouselNode(dataset);
            const json = node.exportJSON();

            json.should.deepEqual({
                type: 'carousel',
                version: 1,
                items: dataset.items,
                caption: dataset.caption
            });
        }));
    });

    describe('exportDOM', function () {
        it('renders mixed image/video structure', editorTest(function () {
            const node = $createCarouselNode(dataset);
            const {element} = node.exportDOM(exportOptions);

            element.tagName.should.equal('FIGURE');
            element.classList.contains('kg-carousel-card').should.be.true();

            const itemEls = element.querySelectorAll('.kg-carousel-container .kg-carousel-item');
            itemEls.length.should.equal(2);

            const img = element.querySelector('img');
            img.getAttribute('src').should.equal(dataset.items[0].src);

            const video = element.querySelector('video');
            video.getAttribute('src').should.equal(dataset.items[1].src);
            video.hasAttribute('controls').should.be.true();
            video.getAttribute('poster').should.equal(dataset.items[1].thumbnailSrc);

            const figcaption = element.querySelector('figcaption');
            figcaption.innerHTML.should.equal(dataset.caption);
        }));
    });

    describe('importDOM', function () {
        it('parses carousel card', editorTest(function () {
            const document = createDocument(`
                <!--kg-card-begin: carousel-->
                <figure class="kg-card kg-carousel-card kg-width-wide">
                    <div class="kg-carousel-container">
                        <div class="kg-carousel-item">
                            <img src="http://localhost:2368/content/images/2019/06/jklm4567.jpeg" width="1200" height="800" alt="Alt test">
                        </div>
                        <div class="kg-carousel-item">
                            <video src="http://localhost:2368/content/videos/test.mp4" width="640" height="360" poster="http://localhost:2368/content/images/2019/06/thumb.jpeg" loop></video>
                        </div>
                    </div>
                    <figcaption>Caption <strong>HTML</strong></figcaption>
                </figure>
                <!--kg-card-end: carousel-->
            `);

            const nodes = $generateNodesFromDOM(editor, document);
            $getRoot().append(...nodes);

            const [carouselNode] = $getRoot(editor).getChildren();

            carouselNode.getType().should.equal('carousel');
            carouselNode.items.length.should.equal(2);

            carouselNode.items[0].type.should.equal('image');
            carouselNode.items[0].fileName.should.equal('jklm4567.jpeg');
            carouselNode.items[0].width.should.equal(1200);
            carouselNode.items[0].height.should.equal(800);

            carouselNode.items[1].type.should.equal('video');
            carouselNode.items[1].fileName.should.equal('test.mp4');
            carouselNode.items[1].thumbnailSrc.should.equal('http://localhost:2368/content/images/2019/06/thumb.jpeg');
            carouselNode.items[1].loop.should.be.true();

            carouselNode.caption.should.equal('Caption <strong>HTML</strong>');
        }));
    });
});
