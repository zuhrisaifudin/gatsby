import {
  ElementType,
  FunctionComponent,
  CSSProperties,
} from 'react';
import { GatsbyImageProps } from './browser';
import { getWrapperProps, getMainProps, getPlaceHolderProps } from '../hooks';
import { Placeholder } from '../placeholder';
import { MainImage, MainImageProps } from '../main-image';
import { LayoutWrapper } from '../layout-wrapper';

export const GatsbyImageHydrator: FunctionComponent<{
  as?: ElementType;
  style?: CSSProperties;
  className?: string;
}> = function GatsbyImageHydrator({ as: Type = 'div', children, ...props }) {
  return <Type {...props}>{children}</Type>;
};

export const GatsbyImage: FunctionComponent<GatsbyImageProps> = function GatsbyImage({
  as,
  className,
  style,
  placeholder,
  images,
  width,
  height,
  layout = 'fixed',
  loading = 'lazy',
  ...props
}) {
  const { style: wStyle, className: wClass, ...wrapperProps } = getWrapperProps(
    width,
    height,
    layout
  );

  return (
    <GatsbyImageHydrator
      {...wrapperProps}
      as={as}
      style={{
        ...wStyle,
        ...style,
      }}
      className={`${wClass}${className ? ` ${className}` : ''}`}
    >
      <LayoutWrapper layout={layout} width={width} height={height}>
        <Placeholder {...getPlaceHolderProps(placeholder)} />
        <MainImage
          data-gatsby-image-ssr=""
          {...(props as Omit<MainImageProps, 'images' | 'fallback'>)}
          // When eager is set we want to start the isLoading state on true (we want to load the img without react)
          {...getMainProps(loading === 'eager', false, images, loading)}
        />
      </LayoutWrapper>
    </GatsbyImageHydrator>
  );
};
