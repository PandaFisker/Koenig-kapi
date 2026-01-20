import DeleteIcon from '../../../../assets/icons/kg-trash.svg?react';
import PropTypes from 'prop-types';
import React from 'react';
import {CardCaptionEditor} from '../../CardCaptionEditor';
import {IconButton} from '../../IconButton';
import {MediaPlaceholder} from '../../MediaPlaceholder';
import {ProgressBar} from '../../ProgressBar';

function UploadOverlay({progress}) {
    const progressStyle = {
        width: `${progress?.toFixed(0)}%`
    };

    return (
        <div className="absolute inset-0 flex min-w-full items-center justify-center overflow-hidden bg-white/50">
            <ProgressBar bgStyle="transparent" style={progressStyle} />
        </div>
    );
}

function FileDragOverlay() {
    return (
        <div className="pointer-events-none absolute inset-0 flex items-center bg-black/60" data-kg-card-drag-text>
            <span className="sans-serif fw7 f7 block w-full text-center font-bold text-white">
                Drop to add up to 9 items
            </span>
        </div>
    );
}

function EmptyCarouselCard({openFilePicker, isDraggedOver}) {
    return (
        <MediaPlaceholder
            desc="Click to select up to 9 images or videos"
            filePicker={openFilePicker}
            icon='gallery'
            isDraggedOver={isDraggedOver}
            multiple={true}
            size='large'
        />
    );
}

function CarouselThumbnails({items, selectedIndex, onSelect, deleteItem, moveItem, isDragging}) {
    return (
        <div className="not-kg-prose mt-4 flex items-center justify-center flex-wrap gap-2" data-testid="carousel-thumbnails">
            {items.map((item, index) => {
                const isSelected = index === selectedIndex;
                const src = item.type === 'video' ? (item.customThumbnailSrc || item.thumbnailSrc || item.previewThumbnailSrc) : (item.previewSrc || item.src);

                return (
                    <div
                        key={`${item.fileName}-${index}`}
                        className={`group/thumb relative h-16 w-24 cursor-pointer overflow-hidden rounded border ${isSelected ? 'border-green-600' : 'border-grey-200'}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => onSelect(index)}
                        onKeyDown={() => onSelect(index)}
                    >
                        {src ? (
                            <img alt="" className="pointer-events-none block size-full object-cover" src={src} />
                        ) : (
                            <div className="flex size-full items-center justify-center bg-grey-100 text-xs text-grey-700">No preview</div>
                        )}

                        {isDragging ? null : (
                            <div className="pointer-events-none invisible absolute inset-0 bg-gradient-to-t from-black/0 via-black/5 to-black/30 p-1 opacity-0 transition-all group-hover/thumb:visible group-hover/thumb:opacity-100">
                                <div className="pointer-events-auto flex items-start justify-between gap-1">
                                    <button
                                        className="rounded bg-white/80 px-1 py-0.5 text-xs"
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            moveItem(index, index - 1);
                                        }}
                                    >
                                        ←
                                    </button>
                                    <button
                                        className="rounded bg-white/80 px-1 py-0.5 text-xs"
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            moveItem(index, index + 1);
                                        }}
                                    >
                                        →
                                    </button>
                                    <div className="ml-auto">
                                        <IconButton Icon={DeleteIcon} label="Delete" onClick={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            deleteItem(item);
                                        }} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function CarouselPreview({item}) {
    if (!item) {
        return null;
    }

    if (item.type === 'video') {
        return (
            <div className="not-kg-prose relative" data-testid="carousel-preview">
                <video
                    className="block w-full rounded"
                    controls
                    playsInline
                    preload="metadata"
                    src={item.src}
                    poster={item.customThumbnailSrc || item.thumbnailSrc || item.previewThumbnailSrc}
                />
            </div>
        );
    }

    return (
        <div className="not-kg-prose relative" data-testid="carousel-preview">
            <img
                alt={item.alt || ''}
                className="block w-full rounded"
                src={item.previewSrc || item.src}
            />
        </div>
    );
}

export function CarouselCard({
    captionEditor,
    captionEditorInitialState,
    clearErrorMessage,
    deleteItem,
    errorMessage,
    fileInputRef,
    filesDropper,
    items = [],
    isSelected,
    mimeTypes = [],
    moveItem,
    onFileChange,
    uploader = {}
}) {
    const [selectedIndex, setSelectedIndex] = React.useState(0);

    React.useEffect(() => {
        if (selectedIndex > items.length - 1) {
            setSelectedIndex(Math.max(0, items.length - 1));
        }
    }, [items.length, selectedIndex]);

    const openFilePicker = () => {
        fileInputRef.current.click();
    };

    const {isLoading, progress} = uploader;
    const {isDraggedOver} = filesDropper;

    const isDragging = isDraggedOver;
    const selectedItem = items[selectedIndex];

    return (
        <figure>
            <div ref={filesDropper.setRef} className="not-kg-prose relative" data-testid="carousel-container">
                {items.length
                    ? (
                        <>
                            <CarouselPreview item={selectedItem} />
                            <CarouselThumbnails
                                deleteItem={deleteItem}
                                isDragging={isDragging}
                                items={items}
                                moveItem={moveItem}
                                selectedIndex={selectedIndex}
                                onSelect={setSelectedIndex}
                            />
                        </>
                    )
                    : (
                        <EmptyCarouselCard
                            isDraggedOver={isDragging}
                            openFilePicker={openFilePicker}
                        />
                    )
                }

                {isLoading ? <UploadOverlay progress={progress} /> : null}
                {items.length && isDraggedOver ? <FileDragOverlay /> : null}

                {errorMessage && !isDragging ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60" data-testid="carousel-error">
                        <span className="center sans-serif f7 block bg-red px-2 font-bold text-white">
                            {errorMessage}.
                            <button className="ml-2 cursor-pointer underline" type="button" onClick={clearErrorMessage}>
                                Dismiss
                            </button>
                        </span>
                    </div>
                ) : null}

                <form onChange={onFileChange}>
                    <input
                        ref={fileInputRef}
                        accept={mimeTypes.join(',')}
                        hidden={true}
                        multiple={true}
                        name="carousel-media-input"
                        type='file'
                    />
                </form>
            </div>

            <CardCaptionEditor
                captionEditor={captionEditor}
                captionEditorInitialState={captionEditorInitialState}
                captionPlaceholder="Type caption for carousel (optional)"
                dataTestId="carousel-card-caption"
                isSelected={isSelected}
            />
        </figure>
    );
}

UploadOverlay.propTypes = {
    progress: PropTypes.number
};

EmptyCarouselCard.propTypes = {
    isDraggedOver: PropTypes.bool,
    openFilePicker: PropTypes.func
};

CarouselThumbnails.propTypes = {
    items: PropTypes.array,
    selectedIndex: PropTypes.number,
    onSelect: PropTypes.func,
    deleteItem: PropTypes.func,
    moveItem: PropTypes.func,
    isDragging: PropTypes.bool
};

CarouselPreview.propTypes = {
    item: PropTypes.object
};

CarouselCard.propTypes = {
    captionEditor: PropTypes.object,
    captionEditorInitialState: PropTypes.object,
    clearErrorMessage: PropTypes.func,
    deleteItem: PropTypes.func,
    errorMessage: PropTypes.string,
    fileInputRef: PropTypes.object,
    filesDropper: PropTypes.object,
    items: PropTypes.array,
    isSelected: PropTypes.bool,
    mimeTypes: PropTypes.array,
    moveItem: PropTypes.func,
    onFileChange: PropTypes.func,
    uploader: PropTypes.object
};
