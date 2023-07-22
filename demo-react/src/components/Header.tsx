import { Avatar } from './Avatar';
import { AvatarStack } from './AvatarStack';

export const Header = () => {
  return (
    <header
      id="main-header"
      className="bg-white"
    >
      <div className="py-4 mx-auto xs:justify-between xs:grid xs:grid-rows-2 xs:grid-cols-2 md:max-w-screen-2xl md:px-16 md:flex md:items-center">
        <section>
          <p className="font-semibold pl-8 md:text-2xl">Team Argo</p>
          <p className="leading-5 pl-8">Pitch deck</p>
        </section>

        <section className="ml-auto flex group relative pr-8 xs:mt-2 md:mt-0">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-ably-black"
          >
            <g clip-path="url(#clip0_43_816)">
              <path
                d="M12 9.99976C12.5523 9.99976 13 10.4475 13 10.9998V16.9998C13 17.552 12.5523 17.9998 12 17.9998C11.4477 17.9998 11 17.552 11 16.9998V10.9998C11 10.4475 11.4477 9.99976 12 9.99976Z"
                fill="#03020D"
              />
              <path
                d="M12 7.99976C12.5523 7.99976 13 7.55204 13 6.99976C13 6.44747 12.5523 5.99976 12 5.99976C11.4477 5.99976 11 6.44747 11 6.99976C11 7.55204 11.4477 7.99976 12 7.99976Z"
                fill="#03020D"
              />
              <path
                fill-rule="evenodd"
                clip-rule="evenodd"
                d="M0.25 12C0.25 5.51065 5.51065 0.25 12 0.25C18.4893 0.25 23.75 5.51065 23.75 12C23.75 18.4893 18.4893 23.75 12 23.75C5.51065 23.75 0.25 18.4893 0.25 12ZM12 1.75C6.33908 1.75 1.75 6.33908 1.75 12C1.75 17.6609 6.33908 22.25 12 22.25C17.6609 22.25 22.25 17.6609 22.25 12C22.25 6.33908 17.6609 1.75 12 1.75Z"
                fill="#03020D"
              />
            </g>
            <defs>
              <clipPath id="clip0_43_816">
                <rect
                  width="24"
                  height="24"
                  fill="white"
                />
              </clipPath>
            </defs>
          </svg>

          <p className="ml-2 xs:text-sm md:font-medium md:text-base">How to try this demo</p>

          <div className="group-hover p-4 bg-[#FAFAFB] rounded-lg hidden group-hover:block absolute top-full mt-2 w-[300px] -left-[70%] border border-[#D9D9DA] xs:text-xs md:text-sm">
            Open this page in multiple windows or share the URL with your team to try out the live avatar stack.
          </div>
        </section>
        <section
          id="avatar-stack-container"
          className="flex justify-end col-span-2 mt-2 pt-2 xs:border-t xs:border-[#D9D9DA] xs:ml-0 xs:pr-8 md:ml-8 md:border-t-0"
        >
          <Avatar
            isCurrent
            name="Nikita Kakuev"
          />
          <AvatarStack
            avatars={[
              { isActive: true, name: 'Nikita Kakuev' },
              { isActive: true, name: 'Nikita Kakuev' },
              { isActive: true, name: 'Nikita Kakuev' },
              { isActive: true, name: 'Nikita Kakuev' },
              { isActive: true, name: 'Nikita Kakuev' },
              { isActive: true, name: 'Nikita Kakuev' },
            ]}
          />
          <div id="avatar-overflow"></div>
        </section>

        <section className="xs:hidden md:ml-[24px] md:flex md:items-center">
          <a
            href="https://github.com/ably-labs/spaces"
            target="_blank"
            className="flex items-center px-5 py-[14px] justify-start"
            rel="noreferrer"
          >
            <p className="font-medium text-base">Space API</p>
            <svg
              width="15"
              height="16"
              viewBox="0 0 15 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="ml-[10px]"
            >
              <g clip-path="url(#clip0_41_4306)">
                <path
                  d="M10 1.75H13.75V6.125"
                  stroke="#2E2E2E"
                  stroke-width="1.875"
                  stroke-linecap="round"
                  stroke-linejoin="bevel"
                />
                <path
                  d="M13.9487 1.5498L8.01123 7.7998"
                  stroke="#2E2E2E"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
                <path
                  d="M13.75 9.54762V11.75C13.75 13.1307 12.6307 14.25 11.25 14.25H3.75C2.36929 14.25 1.25 13.1307 1.25 11.75V4.25C1.25 2.86929 2.36929 1.75 3.75 1.75H6.5625"
                  stroke="#2E2E2E"
                  stroke-width="1.5"
                  stroke-linecap="round"
                />
              </g>
              <defs>
                <clipPath id="clip0_41_4306">
                  <rect
                    width="15"
                    height="15"
                    fill="white"
                    transform="translate(0 0.5)"
                  />
                </clipPath>
              </defs>
            </svg>
          </a>

          <a
            href="https://docs.google.com/forms/d/e/1FAIpQLSer2ujLNw0rlrf2FvfIhLxyiWuuvTwYkDDqHmv30F8Cs00YWg/viewform"
            className="text-white bg-ably-black rounded-md py-[11px] px-5 leading-[1.125] md:text-xs lg:text-base inline-block lg:ml-[24px]"
          >
            Sign Up
          </a>
        </section>
      </div>
    </header>
  );
};
