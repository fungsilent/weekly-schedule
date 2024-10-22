import { Viewer } from '@react-pdf-viewer/core'
import { SelectionMode } from '@react-pdf-viewer/selection-mode'
import { toolbarPlugin, ToolbarSlot } from '@react-pdf-viewer/toolbar'
import '@react-pdf-viewer/toolbar/lib/styles/index.css'
import '@react-pdf-viewer/core/lib/styles/index.css'

import Modal from 'react-modal'
Modal.setAppElement('#root')

const styles = {
    overlay: {
        backgroundColor: 'rgb(40 40 40 / 70%)',
    },
    content: {
        inset: 0,
        padding: 0,
    },
}

const ViewPDF = ({ pdf, modalOpen, closeModal }) => {
    const toolbarPluginInstance = toolbarPlugin({
        selectionModePlugin: {
            selectionMode: SelectionMode.Hand,
        },
    })
    const { renderDefaultToolbar, Toolbar } = toolbarPluginInstance

    /* render */
    const toolbarTransform = slot => ({
        ...slot,
        ShowSearchPopover: () => <></>,
        Download: () => <></>,
        Open: () => <></>,
        Print: () => <></>,
        Rotate: () => <></>,
        RotateBackwardMenuItem: () => <></>,
        RotateForwardMenuItem: () => <></>,
        EnterFullScreen: () => <></>,
        SwitchTheme: () => <></>,
    })

    return (
        <Modal
            isOpen={modalOpen}
            onRequestClose={closeModal}
            style={styles}
        >
            <div className='view-pdf'>
                <Toolbar>{renderDefaultToolbar(toolbarTransform)}</Toolbar>
                <div
                    className='close'
                    onClick={closeModal}
                >
                    <span>Close</span>
                </div>
            </div>
            <Viewer
                fileUrl={pdf}
                defaultScale={1.3}
                plugins={[toolbarPluginInstance]}
            />
        </Modal>
    )
}

export default ViewPDF