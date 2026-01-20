import CardContext from '../../context/CardContext';
import KoenigComposerContext from '../../context/KoenigComposerContext';
import React from 'react';
import extractVideoMetadata from '../../utils/extractVideoMetadata';
import useFileDragAndDrop from '../../hooks/useFileDragAndDrop';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../../components/ui/ActionToolbar';
import {CarouselCard} from '../../components/ui/cards/carousel/CarouselCard';
import {MAX_ITEMS} from './CarouselNode';
import {SnippetActionToolbar} from '../../components/ui/SnippetActionToolbar';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../../components/ui/ToolbarMenu';
import {getImageDimensions} from '../../utils/getImageDimensions';
import {openFileSelection} from '../../utils/openFileSelection';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

function isVideoFile(file) {
    return file?.type?.startsWith('video/');
}

function isImageFile(file) {
    return file?.type?.startsWith('image/');
}

export function CarouselNodeComponent({nodeKey, captionEditor, captionEditorInitialState, triggerFileDialog, initialFiles}) {
    const [editor] = useLexicalComposerContext();
    const {fileUploader, cardConfig} = React.useContext(KoenigComposerContext);
    const {isSelected} = React.useContext(CardContext);

    const fileInputRef = React.useRef();

    const [errorMessage, setErrorMessage] = React.useState(null);
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);

    const [items, setItems] = React.useState(() => {
        const existingItems = editor.getEditorState().read(() => {
            const node = $getNodeByKey(nodeKey);
            return node.items || [];
        });
        return existingItems;
    });

    const mediaFilesDropper = useFileDragAndDrop({handleDrop: handleMediaFilesDrop});

    const imageUploader = fileUploader.useFileUpload('image');
    const videoUploader = fileUploader.useFileUpload('video');
    const thumbnailUploader = fileUploader.useFileUpload('mediaThumbnail');

    const imageMimeTypes = fileUploader.fileTypes.image?.mimeTypes || ['image/*'];
    const videoMimeTypes = fileUploader.fileTypes.video?.mimeTypes || ['video/*'];
    const acceptMimeTypes = Array.from(new Set([...imageMimeTypes, ...videoMimeTypes]));

    function setNodeItems(newItems) {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setItems(newItems);
        });
    }

    const clearErrorMessage = () => {
        setErrorMessage(null);
    };

    const deleteItem = (itemToDelete) => {
        const newItems = (items || []).filter(item => item.fileName !== itemToDelete.fileName);
        setItems(newItems);
        setNodeItems(newItems);
    };

    const moveItem = (fromIndex, toIndex) => {
        if (toIndex < 0 || toIndex >= items.length) {
            return;
        }

        const newItems = [...items];
        const [moved] = newItems.splice(fromIndex, 1);
        newItems.splice(toIndex, 0, moved);

        setItems(newItems);
        setNodeItems(newItems);
    };

    const handleMediaUploads = async (files) => {
        const currentCount = items.length;
        const allowedCount = MAX_ITEMS - currentCount;

        const strippedFiles = Array.prototype.slice.call(files, 0, allowedCount);
        if (strippedFiles.length < files.length) {
            setErrorMessage('Carousels are limited to 9 items');
        }

        if (strippedFiles.length === 0) {
            return;
        }

        // optimistic preview items
        const newItems = [...items];
        const pendingUploads = [];

        for (const file of strippedFiles) {
            if (isImageFile(file)) {
                const previewSrc = URL.createObjectURL(file);
                const {width, height} = await getImageDimensions(previewSrc);

                newItems.push({
                    type: 'image',
                    fileName: file.name,
                    previewSrc,
                    width,
                    height
                });

                pendingUploads.push({type: 'image', file});
            } else if (isVideoFile(file)) {
                let thumbnailBlob, duration, width, height, mimeType;
                try {
                    ({thumbnailBlob, duration, width, height, mimeType} = await extractVideoMetadata(file));
                } catch (error) {
                    setErrorMessage('The video you uploaded is not supported');
                    continue;
                }

                const previewThumbnailSrc = URL.createObjectURL(thumbnailBlob);

                newItems.push({
                    type: 'video',
                    fileName: file.name,
                    mimeType,
                    width,
                    height,
                    duration,
                    loop: false,
                    previewThumbnailSrc
                });

                pendingUploads.push({type: 'video', file, thumbnailBlob});
            } else {
                setErrorMessage('Unsupported file type');
            }
        }

        setItems(newItems);

        // Upload images in one go
        const imageFiles = pendingUploads.filter(p => p.type === 'image').map(p => p.file);
        if (imageFiles.length) {
            const uploadResults = await imageUploader.upload(imageFiles);

            if (!uploadResults) {
                setErrorMessage('Something went wrong while uploading media. Please refresh and try again');
                return;
            }

            uploadResults.forEach((result) => {
                const item = newItems.find(i => i.fileName === result.fileName);
                if (item) {
                    item.src = result.url;
                }
            });
        }

        // Upload videos individually because we also need to upload thumbnails
        const videoPending = pendingUploads.filter(p => p.type === 'video');
        for (const pending of videoPending) {
            const videoUploadResult = await videoUploader.upload([pending.file]);
            const videoUrl = videoUploadResult?.[0]?.url;

            if (!videoUrl) {
                setErrorMessage('Something went wrong while uploading media. Please refresh and try again');
                return;
            }

            const item = newItems.find(i => i.fileName === pending.file.name);
            if (item) {
                item.src = videoUrl;
            }

            if (pending.thumbnailBlob) {
                const thumbnailFile = new File([pending.thumbnailBlob], `${pending.file.name}.jpg`, {type: 'image/jpeg'});
                const thumbUploadResult = await thumbnailUploader.upload([thumbnailFile], {formData: {url: videoUrl}});
                const thumbUrl = thumbUploadResult?.[0]?.url;

                if (thumbUrl && item) {
                    item.thumbnailSrc = thumbUrl;
                }
            }
        }

        // clear preview-only fields and persist
        newItems.forEach((item) => {
            delete item.previewSrc;
            delete item.previewThumbnailSrc;
        });

        setItems(newItems);
        setNodeItems(newItems);
    };

    const onFileChange = async (e) => {
        const files = e.target.files;

        if (!files || !files.length) {
            return;
        }

        await handleMediaUploads(files);
    };

    async function handleMediaFilesDrop(files) {
        await handleMediaUploads(files);
    }

    function handleToolbarAdd(event) {
        event.preventDefault();
        fileInputRef.current.click();
    }

    React.useEffect(() => {
        const uploadInitialFiles = async (files) => {
            if (files && files.length && !imageUploader.isLoading && !videoUploader.isLoading) {
                await handleMediaUploads(files);
            }
        };

        uploadInitialFiles(initialFiles);

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    React.useEffect(() => {
        if (!triggerFileDialog) {
            return;
        }

        const renderTimeout = setTimeout(() => {
            openFileSelection({fileInputRef});

            editor.update(() => {
                const node = $getNodeByKey(nodeKey);
                node.triggerFileDialog = false;
            });
        });

        return (() => {
            clearTimeout(renderTimeout);
        });
    });

    const hideToolbar =
        !isSelected ||
        mediaFilesDropper.isDraggedOver ||
        items.length <= 0;

    return (
        <>
            <CarouselCard
                captionEditor={captionEditor}
                captionEditorInitialState={captionEditorInitialState}
                clearErrorMessage={clearErrorMessage}
                deleteItem={deleteItem}
                errorMessage={errorMessage}
                fileInputRef={fileInputRef}
                filesDropper={mediaFilesDropper}
                items={items}
                isSelected={isSelected}
                mimeTypes={acceptMimeTypes}
                moveItem={moveItem}
                onFileChange={onFileChange}
                uploader={{
                    isLoading: imageUploader.isLoading || videoUploader.isLoading || thumbnailUploader.isLoading,
                    progress: 0
                }}
            />

            <ActionToolbar
                data-kg-card-toolbar="carousel"
                isVisible={showSnippetToolbar}
            >
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>

            <ActionToolbar
                data-kg-card-toolbar="carousel"
                isVisible={!hideToolbar}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem dataTestId="add-carousel-item" icon="add" isActive={false} label="Add media" onClick={handleToolbarAdd} />
                    <ToolbarMenuSeparator hide={!cardConfig.createSnippet} />
                    <ToolbarMenuItem
                        dataTestId="create-snippet"
                        hide={!cardConfig.createSnippet}
                        icon="snippet"
                        isActive={false}
                        label="Save as snippet"
                        onClick={() => setShowSnippetToolbar(true)}
                    />
                </ToolbarMenu>
            </ActionToolbar>
        </>
    );
}
