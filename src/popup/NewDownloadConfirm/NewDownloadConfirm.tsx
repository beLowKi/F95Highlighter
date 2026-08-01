import { Button, ButtonGroup, Modal } from "react-bootstrap";
import type { MediaDownload } from "types/data";

export function NewDownloadConfirm(args: { 
    show: boolean, 
    onSubmit: (value: boolean) => void, 
    onDismiss: () => void,
    download: MediaDownload
}) {
    return (
        <Modal show={args.show} onHide={args.onDismiss}>
            <Modal.Title>Add Download for {args.download.name}?</Modal.Title>
            
            <Modal.Footer>
                <ButtonGroup>
                    <Button type="submit" onSubmit={() => args.onSubmit(true)}>
                        Confirm
                    </Button>
                    <Button type="reset" onSubmit={() => args.onSubmit(false)}>
                        Cancel
                    </Button>
                </ButtonGroup>
            </Modal.Footer>
        </Modal>
    );
}