import { Button, ButtonGroup, Modal } from "react-bootstrap";
import type { MediaDownload } from "types/data";

export function UpdateDownloadConfirm(args: {
    show: boolean, 
    onSubmit: (value: boolean) => void, 
    onDismiss: () => void,
    old: MediaDownload,
    new: MediaDownload
}) {
    return (
        <Modal show={args.show} onHide={args.onDismiss}>
            <Modal.Title>Update Download for {args.old.name}?</Modal.Title>
            
            <Modal.Body>
                {/* TODO compare old and new */}
            </Modal.Body>
            
            <Modal.Footer>
                <ButtonGroup>
                    <Button type="submit" onClick={() => args.onSubmit(true)}>
                        Confirm
                    </Button>
                    <Button type="reset" onClick={() => args.onSubmit(false)}>
                        Cancel
                    </Button>
                </ButtonGroup>
            </Modal.Footer>

        </Modal>
    );
}