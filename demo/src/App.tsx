import { useEffect, useState } from 'react';
import { useMembers, useSpace, useLocations } from '@ably/spaces/react';

import { Header, SlideMenu, CurrentSlide, AblySvg, slides, Modal } from './components';
import { getRandomName, getRandomColor } from './utils';
import { PreviewProvider } from './components/PreviewContext.tsx';

import { type Member } from './utils/types';

const App = () => {
  const { space, enter } = useSpace();
  const { self, others } = useMembers();
  const { update } = useLocations();
  const [isModalVisible, setModalIsVisible] = useState(false);

  useEffect(() => {
    if (!space || self?.profileData.name) return;

    const init = async () => {
      const name = getRandomName();
      await enter({ name, color: getRandomColor() });
      await update({ slide: `${0}`, element: null });
      setModalIsVisible(true);
    };

    init();
  }, [space, self?.profileData.name]);

  return (
    <div className="min-w-[375px]">
      <Header
        self={self as Member}
        others={others as Member[]}
      />
      <div className="text-ably-charcoal-grey bg-slate-500">
        <main>
          <section
            id="feature-display"
            className="absolute gap-12 bg-[#F7F6F9] w-full h-[calc(100%-80px)] -z-10 overflow-y-hidden overflow-x-hidden flex justify-between min-w-[375px] xs:flex-col md:flex-row"
          >
            <PreviewProvider preview>
              <SlideMenu slides={slides} />
            </PreviewProvider>
            <CurrentSlide slides={slides} />
          </section>
        </main>
        <a
          className="absolute right-6 bottom-6 items-center flex flex-row rounded-md bg-ably-black h-[56px] px-[20px] py-[11px] text-white font-medium"
          href="https://ably.com/sign-up"
        >
          Powered by
          <AblySvg className="ml-2" />
        </a>
      </div>
      <Modal
        self={self as Member}
        isVisible={isModalVisible}
        setIsVisible={setModalIsVisible}
      />
    </div>
  );
};

export default App;
