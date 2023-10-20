import { useContext, useEffect, useState } from 'react';

import { Header, SlideMenu, SpacesContext, CurrentSlide, AblySvg, slides, Modal, NameModalContext } from './components';
import { getRandomName, getRandomColor } from './utils';
import { useMembers } from './hooks';
import { PreviewProvider } from './components/PreviewContext.tsx';

const App = () => {
  const space = useContext(SpacesContext);
  const { self, others } = useMembers();
  const [isModalVisible, setIsModalVisible] = useState(false);

  useEffect(() => {
    if (!space || self?.profileData.name) return;

    const enter = async () => {
      const name = getRandomName();
      await space.enter({ name, color: getRandomColor() });
      await space.locations.set({ slide: `${0}`, element: null });
      setIsModalVisible(true);
    };

    enter();
  }, [space, self?.profileData.name]);

  return (
    <NameModalContext.Provider value={{ isModalVisible, setIsModalVisible }}>
      <div className="min-w-[375px]">
        <Header
          self={self}
          others={others}
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
        <Modal self={self} />
      </div>
    </NameModalContext.Provider>
  );
};

export default App;
