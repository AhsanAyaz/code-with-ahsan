import React from 'react'
import styles from '../../hackstack/hackstack.module.css'
import LayoutWrapper from '../../../../components/LayoutWrapper'
import { HackStack2023Base } from './index'

const HackStacKWithRoboto = () => {
  return <HackStack2023Base />
}

HackStacKWithRoboto.getLayout = ({ children }) => {
  return (
    <main className={styles.eventsPage}>
      <LayoutWrapper>{children}</LayoutWrapper>
    </main>
  )
}

export default HackStacKWithRoboto
