import { AblySvg, LockSvg } from './svg';

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
              <LockSvg className="top-[3px] relative" />
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
          <AblySvg className="ml-2" />
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
                <LockSvg className="relative" />
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
