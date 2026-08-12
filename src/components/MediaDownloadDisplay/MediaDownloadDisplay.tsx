import type { MediaDownload } from "types/data";
import { truncateStr } from "utils/func";

export function MediaDownloadDisplay(args: { 
    download: MediaDownload, 
    maxNameLength: number,
    height?: number | string
}) {
    
    const { download, maxNameLength, height } = args;
    const displayName = truncateStr(download.name, maxNameLength).trim();

    return (
        <div className="container text-center pb-1" style={{ height }}>
            <div className="d-flex align-items-center justify-content-center p-1"
                style={{ height: '80%' }}>
                {displayName}
            </div>

            <div className="d-flex align-items-center justify-content-center p-1"
                style={{ height: '20%' }}>
                {(download.certainty * 100).toFixed(2)}%
            </div>
        </div>
    );
}

export default MediaDownloadDisplay;
