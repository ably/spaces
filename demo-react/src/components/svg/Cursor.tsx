import { SVGProps } from 'react';

interface Props extends SVGProps<SVGSVGElement> {
  startColor: string;
  endColor: string;
  id: string;
}

export const CursorSvg = ({ startColor, endColor, id, ...props }: Props) => {
  return (
    <svg
      width="27"
      height="27"
      viewBox="0 0 27 27"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M0.391407 3.21084L7.76105 25.3198C8.27823 26.8713 10.2474 27.3361 11.4038 26.1797L26.1431 11.4404C27.2995 10.284 26.8347 8.31485 25.2831 7.79767L3.17421 0.42803C1.45434 -0.145257 -0.181883 1.49097 0.391407 3.21084Z"
        fill={`url(#gradient-${id})`}
      />
      <defs>
        <linearGradient
          id={`gradient-${id}`}
          x1="28.6602"
          y1="-0.963373"
          x2="-0.999994"
          y2="28.6968"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor={startColor} />
          <stop
            offset="1"
            stopColor={endColor}
          />
        </linearGradient>
      </defs>
    </svg>
  );
};
