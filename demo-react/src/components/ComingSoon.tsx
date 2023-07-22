export const ComingSoon = () => {
  return (
    <>
      <div
        id="overlay"
        className="hidden absolute right-0 bg-black bg-opacity-25 w-[354px] h-[calc(100%-80px)] select-none z-100 lg:grid"
      >
        <aside
          id="coming-soon"
          className="relative w-[336px] h-[184px] backdrop-blur-ably-xs place-self-center -top-[85px] bg-ably-light-grey bg-opacity-80 rounded-2xl"
        >
          <div className="flex flex-col relative mx-8 my-6">
            <div className="flex flex-row justify-center items-start font-medium text-2xl h-[40px] gap-2">
              <svg
                className="top-[3px] relative"
                width="24"
                height="24"
                viewBox="0 0 25 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6.225 22.575C5.57875 22.575 5.02552 22.3449 4.5653 21.8847C4.1051 21.4245 3.875 20.8712 3.875 20.225V9.825C3.875 9.17187 4.1051 8.61275 4.5653 8.14765C5.02552 7.68255 5.57875 7.45 6.225 7.45H7.475V5.6C7.475 4.18017 7.96138 2.97521 8.93415 1.98512C9.9069 0.995042 11.0944 0.5 12.4966 0.5C13.8989 0.5 15.0875 0.995042 16.0625 1.98512C17.0375 2.97521 17.525 4.18017 17.525 5.6V7.45H18.775C19.4281 7.45 19.9872 7.68255 20.4524 8.14765C20.9174 8.61275 21.15 9.17187 21.15 9.825V20.225C21.15 20.8712 20.9174 21.4245 20.4524 21.8847C19.9872 22.3449 19.4281 22.575 18.775 22.575H6.225ZM6.225 20.225H18.775V9.825H6.225V20.225ZM12.5042 16.95C13.0347 16.95 13.4875 16.7664 13.8625 16.3992C14.2375 16.032 14.425 15.5906 14.425 15.075C14.425 14.575 14.2361 14.1208 13.8583 13.7125C13.4805 13.3042 13.0263 13.1 12.4958 13.1C11.9653 13.1 11.5125 13.3042 11.1375 13.7125C10.7625 14.1208 10.575 14.5792 10.575 15.0875C10.575 15.5958 10.7639 16.0333 11.1417 16.4C11.5195 16.7667 11.9737 16.95 12.5042 16.95ZM9.825 7.45H15.175V5.60577C15.175 4.82692 14.9196 4.17708 14.4088 3.65625C13.898 3.13542 13.2647 2.875 12.5088 2.875C11.7529 2.875 11.1167 3.13542 10.6 3.65625C10.0833 4.17708 9.825 4.82692 9.825 5.60577V7.45Z"
                  fill="#03020D"
                />
              </svg>
              <h4>Coming Soon</h4>
            </div>
            <p className="text-center h-[40px]">
              We are incrementally rolling out new features in the multiplayer space library.
            </p>
            <div className="flex flex-row items-end justify-center h-[56px]">
              <a
                className="rounded-md bg-ably-black px-[20px] py-[11px] text-white font-medium"
                href="https://ably.com/sign-up"
              >
                Sign Up for Early Access
              </a>
            </div>
          </div>
        </aside>
        <a
          className="absolute right-6 bottom-6 items-center flex flex-row rounded-md bg-ably-black h-[56px] px-[20px] py-[11px] text-white font-medium"
          href="https://ably.com/sign-up"
        >
          Powered by
          <svg
            className="ml-2"
            width="78"
            height="24"
            viewBox="0 0 78 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M48.1386 18.7338V3.06592H51.0239V8.73823C52.0013 7.82606 53.2601 7.32015 54.5894 7.32015C57.7092 7.32015 60.4772 9.6504 60.4772 13.1611C60.4772 16.6718 57.7092 19.0097 54.5894 19.0097C53.1898 19.0097 51.8683 18.4655 50.8831 17.4767V18.7338H48.1386ZM57.5919 13.1611C57.5919 11.1988 56.1689 9.8267 54.3079 9.8267C52.4939 9.8267 51.0942 11.1298 51.0239 13.0231V13.1611C51.0239 15.1234 52.447 16.4955 54.3079 16.4955C56.1689 16.4955 57.5919 15.1234 57.5919 13.1611ZM61.8143 18.7338V3.06592H64.6995V18.7338H61.8143ZM68.7342 22.7964L70.4153 18.8641L65.849 7.5961H68.9688L71.8775 15.4683L74.8331 7.5961H77.9999L71.8071 22.804H68.7342V22.7964ZM43.5566 7.5961V9.01418C42.5557 7.94104 41.1561 7.32782 39.7174 7.32782C36.5976 7.32782 33.8296 9.65806 33.8296 13.1688C33.8296 16.6871 36.5976 19.0097 39.7174 19.0097C41.2109 19.0097 42.6261 18.3735 43.6504 17.2314V18.7414H46.1682V7.5961H43.5566ZM43.2751 13.1611C43.2751 15.1004 41.852 16.4955 39.9911 16.4955C38.1301 16.4955 36.707 15.1004 36.707 13.1611C36.707 11.2218 38.1301 9.8267 39.9911 9.8267C41.8051 9.8267 43.2047 11.1528 43.2751 13.0231V13.1611Z"
              fill="white"
            />
            <path
              d="M14.7547 0L2.40829 22.1527L0 20.497L11.4238 0H14.7547ZM14.9267 0L27.2731 22.1527L29.6814 20.497L18.2577 0H14.9267Z"
              fill="url(#paint0_linear_80_9285)"
            />
            <path
              d="M27.1009 22.2831L14.8405 12.8701L2.58008 22.2831L5.0822 24.0001L14.8405 16.5111L24.5988 24.0001L27.1009 22.2831Z"
              fill="url(#paint1_linear_80_9285)"
            />
            <defs>
              <linearGradient
                id="paint0_linear_80_9285"
                x1="4.18761"
                y1="28.0665"
                x2="24.3817"
                y2="5.18853"
                gradientUnits="userSpaceOnUse"
              >
                <stop stop-color="#FF5416" />
                <stop
                  offset="0.2535"
                  stop-color="#FF5115"
                />
                <stop
                  offset="0.461"
                  stop-color="#FF4712"
                />
                <stop
                  offset="0.6523"
                  stop-color="#FF350E"
                />
                <stop
                  offset="0.8327"
                  stop-color="#FF1E08"
                />
                <stop
                  offset="1"
                  stop-color="#FF0000"
                />
              </linearGradient>
              <linearGradient
                id="paint1_linear_80_9285"
                x1="8.19227"
                y1="29.5196"
                x2="20.1275"
                y2="15.9981"
                gradientUnits="userSpaceOnUse"
              >
                <stop stop-color="#FF5416" />
                <stop
                  offset="0.2535"
                  stop-color="#FF5115"
                />
                <stop
                  offset="0.461"
                  stop-color="#FF4712"
                />
                <stop
                  offset="0.6523"
                  stop-color="#FF350E"
                />
                <stop
                  offset="0.8327"
                  stop-color="#FF1E08"
                />
                <stop
                  offset="1"
                  stop-color="#FF0000"
                />
              </linearGradient>
            </defs>
          </svg>
        </a>
      </div>
      {/* <!-- show only on xs and sm --> */}
      <div className="p-10 xs:flex xs:justify-center md:hidden">
        <div className="max-w-xs">
          <aside
            id="coming-soon"
            className="backdrop-blur-ably-xs justify-center bg-ably-light-grey bg-opacity-80 rounded-2xl border"
          >
            <div className="flex flex-col relative mx-8 my-3">
              <div className="flex flex-row justify-center items-start font-medium text-md h-[50px] gap-2">
                <svg
                  className="relative"
                  width="24"
                  height="24"
                  viewBox="0 0 25 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6.225 22.575C5.57875 22.575 5.02552 22.3449 4.5653 21.8847C4.1051 21.4245 3.875 20.8712 3.875 20.225V9.825C3.875 9.17187 4.1051 8.61275 4.5653 8.14765C5.02552 7.68255 5.57875 7.45 6.225 7.45H7.475V5.6C7.475 4.18017 7.96138 2.97521 8.93415 1.98512C9.9069 0.995042 11.0944 0.5 12.4966 0.5C13.8989 0.5 15.0875 0.995042 16.0625 1.98512C17.0375 2.97521 17.525 4.18017 17.525 5.6V7.45H18.775C19.4281 7.45 19.9872 7.68255 20.4524 8.14765C20.9174 8.61275 21.15 9.17187 21.15 9.825V20.225C21.15 20.8712 20.9174 21.4245 20.4524 21.8847C19.9872 22.3449 19.4281 22.575 18.775 22.575H6.225ZM6.225 20.225H18.775V9.825H6.225V20.225ZM12.5042 16.95C13.0347 16.95 13.4875 16.7664 13.8625 16.3992C14.2375 16.032 14.425 15.5906 14.425 15.075C14.425 14.575 14.2361 14.1208 13.8583 13.7125C13.4805 13.3042 13.0263 13.1 12.4958 13.1C11.9653 13.1 11.5125 13.3042 11.1375 13.7125C10.7625 14.1208 10.575 14.5792 10.575 15.0875C10.575 15.5958 10.7639 16.0333 11.1417 16.4C11.5195 16.7667 11.9737 16.95 12.5042 16.95ZM9.825 7.45H15.175V5.60577C15.175 4.82692 14.9196 4.17708 14.4088 3.65625C13.898 3.13542 13.2647 2.875 12.5088 2.875C11.7529 2.875 11.1167 3.13542 10.6 3.65625C10.0833 4.17708 9.825 4.82692 9.825 5.60577V7.45Z"
                    fill="#03020D"
                  />
                </svg>
                <h4 className="text-md">Coming Soon</h4>
              </div>
              <p className="text-center text-xs">
                We are incrementally rolling out new features in the multiplayer space library.
              </p>
              <div className="flex justify-center">
                <a
                  className="rounded-md bg-ably-black px-[15px] py-2 mt-3 text-white font-normal text-xs"
                  href="https://ably.com/sign-up"
                >
                  Sign Up for Early Access
                </a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
};
