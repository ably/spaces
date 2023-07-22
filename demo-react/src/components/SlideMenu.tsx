import { AvatarStack } from './AvatarStack';

export const SlideMenu = () => (
  <menu className="w-[300px] h-0 xs:hidden md:block">
    <ol
      id="slide-left-preview-list"
      className="relative top-[68px] -left-[26px] flex flex-col scale-[0.2] w-[20%] h-[20%] max-h-[80vh]"
    >
      <li
        data-id="slide-preview-list-item"
        className="relative flex flex-row py-8 w-[1320px] rounded-tr-[20px] rounded-br-[20px] cursor-pointer bg-[#EEE9FF]"
      >
        <div
          data-id="slide-preview-selected-indicator"
          className="pl-[45px] w-[25px] self-center"
        >
          <svg
            width="25"
            height="445"
            viewBox="0 0 25 445"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <rect
              width="25"
              height="445"
              rx="12.5"
              fill="#835DEF"
            />
          </svg>
        </div>
        <p
          data-id="slide-preview-number"
          className="text-7xl p-11 pl-[135px] text-ably-avatar-stack-demo-number-text self-center bg-transparent"
        >
          1
        </p>
        <div
          data-id="slide-preview-container"
          className="relative rounded-[30px] border-2 border-ably-avatar-stack-demo-slide-preview-border w-[1020px] h-[687px] min-w-[1020px] min-h-[687px] bg-white"
        ></div>
        <AvatarStack
          isInContent
          avatars={[{ isActive: true, name: 'Nikita Kakuev' }]}
        />
      </li>
    </ol>
  </menu>
);
