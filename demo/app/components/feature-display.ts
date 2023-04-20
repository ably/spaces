import Space from '../../../src/Space';
import { renderSlidePreviewMenu } from './render-slide-preview-menu';
import { renderSelectedSlide } from './render-slide';
import { renderComments } from './render-comments';

export const renderFeatureDisplay = (space: Space) => {
  renderSlidePreviewMenu(space);
  renderSelectedSlide(space);
  renderComments();
};
