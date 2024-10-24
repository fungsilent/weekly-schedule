import { useState, useEffect } from 'react'
import { Worker } from '@react-pdf-viewer/core'

import Error from './components/Error'
import Shcedule from './components/Schedule'
import PDFViewer from './components/PDFViewer'
import { fetchApiToken, fetchMessage } from './data'
import './main.css'

/* development flag */
const dev = true

const App = () => {
    const [modalOpen, setModalOpen] = useState(false)
    const [pdf, setPdf] = useState('')
    const [error, setError] = useState('')
    const [data, setData] = useState([])

    useEffect(() => {
        const doFetch = async () => {
            const isLogin = await fetchApiToken(dev)
            if (!isLogin) {
                return setError('invalid_auth')
            }

            const [data, error] = await fetchMessage(dev)
            setError(error)
            setData(data)
        }
        doFetch()
    }, [])

    const openModal = pdf => {
        setPdf(pdf)
        setModalOpen(true)
    }
    const closeModal = () => setModalOpen(false)

    /* render */
    return (
        <Worker workerUrl='./pdf.worker.min.js'>
            <main>
                {!!error && <Error message={error} />}
                {!error && (
                    <Shcedule
                        data={data}
                        openModal={openModal}
                    />
                )}
                <PDFViewer
                    pdf={pdf}
                    modalOpen={modalOpen}
                    closeModal={closeModal}
                />
            </main>
        </Worker>
    )
}

export default App
