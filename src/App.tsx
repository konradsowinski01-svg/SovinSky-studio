import { useCallback, useRef, useState } from "react";
import { About } from "./components/About";
import { Contact } from "./components/Contact";
import { Footer } from "./components/Footer";
import { Hero } from "./components/Hero";
import { Preloader } from "./components/Preloader";
import { Topbar } from "./components/Topbar";
import { Work } from "./components/Work";
import { useLenis } from "./hooks/useLenis";
import { usePageMotion } from "./hooks/usePageMotion";
import styles from "./App.module.css";

export default function App() {
  const [ready, setReady] = useState(false);
  const doneRef = useRef(false);
  const onDone = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setReady(true);
  }, []);
  useLenis(ready);
  usePageMotion(ready);

  return (
    <>
      {!ready ? <Preloader onDone={onDone} /> : null}
      <div
        id="top"
        className={`${styles.app} ${ready ? styles.revealed : styles.hidden}`}
        aria-hidden={!ready}
      >
        <Topbar />
        <main id="main">
          <Hero />
          <Work />
          <About />
          <Contact />
        </main>
        <Footer />
      </div>
    </>
  );
}
