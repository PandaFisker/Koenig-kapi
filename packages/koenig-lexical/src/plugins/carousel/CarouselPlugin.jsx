import React from 'react';
import {$createCarouselNode, CarouselNode, INSERT_CAROUSEL_COMMAND} from '../../nodes/carousel/CarouselNode';
import {COMMAND_PRIORITY_LOW} from 'lexical';
import {INSERT_CARD_COMMAND} from '../KoenigBehaviourPlugin';
import {mergeRegister} from '@lexical/utils';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const CarouselPlugin = () => {
    const [editor] = useLexicalComposerContext();

    React.useEffect(() => {
        if (!editor.hasNodes([CarouselNode])) {
            console.error('CarouselPlugin: CarouselNode not registered'); // eslint-disable-line no-console
            return;
        }

        return mergeRegister(
            editor.registerCommand(
                INSERT_CAROUSEL_COMMAND,
                async (dataset) => {
                    const cardNode = $createCarouselNode(dataset);
                    editor.dispatchCommand(INSERT_CARD_COMMAND, {cardNode});

                    return true;
                },
                COMMAND_PRIORITY_LOW
            )
        );
    }, [editor]);

    return null;
};

export default CarouselPlugin;
