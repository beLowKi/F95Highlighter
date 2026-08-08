import { useState } from "react";
import { Button, Col, Form, OverlayTrigger, Row, Tooltip } from "react-bootstrap";
import { Settings } from "types/data";
import { LOCAL_STORAGE_KEYS } from "utils/const";

const FORM_IDS = {
    SEARCH_SAMPLE_SIZE:       'search-sample-size',
    UNCERTAIN_COLOR:         'uncertain-highlight',
    LOW_CERTAINTY_COLOR:      'lowCertainty-highlight',
    MID_CERTAINTY_COLOR:      'midCertainty-highlight',
    HIGH_CERTAINTY_COLOR:     'highCertainty-highlight',
} as const;


export function SettingsScreen(args: { settings: Settings }) {
    const [settingData, setSettingData] = useState(() => structuredClone(args.settings));
    

    async function handleSubmit( event: React.FormEvent ): Promise<void> {
        // Stops app from trying to reload the page
        // commenting this will just make it go back to downloads 
        // (or whatever page is default tab)
        event.preventDefault();
        // console.log(`Submitted settings: ${JSON.stringify(settingData, null, 2)}`);
        
        // Updates storage
        await chrome.storage.local.set({ [LOCAL_STORAGE_KEYS.SETTINGS]: settingData });
    }
    
    function handleReset(): void {
        setSettingData(() => structuredClone(args.settings));
    }
    
    function handleChange( event: any ) {
        const key = event.target.name;
        // console.log(key, (key in Settings.shape.highlights.shape));
        
        if ( !( key in Settings.shape.highlights.shape ) ) {
            setSettingData({ ...settingData, [event.target.name]: event.target.value });
            return;
        }
        
        const data = { ...settingData };
        data.highlights[key as keyof Settings['highlights']] = event.target.value;

        setSettingData(data);
    }

    
    return (
        <Form className="p-4 text-lg" onSubmit={handleSubmit} onReset={handleReset}>

            <Row xs={8}>

                {/* Search sample size */}
                <Form.Group>
                    <OverlayTrigger
                        delay={{ show: 350, hide: 200 }}
                        placement="bottom"
                        overlay={<Tooltip>Number of top search results checked per imported download</Tooltip>}>

                        <Form.Label>
                            <p>
                                Search Sample Size: {settingData.searchSampleSize}
                            {settingData.searchSampleSize > 7
                                ? <p style={{ fontSize: 15 }}>
                                    <b>**WARNING**</b> Large values may make importing take a lot longer
                                </p>
                                : null}
                            </p>
                            
                        </Form.Label>
                        
                    </OverlayTrigger>
                    
                    <Form.Range id={FORM_IDS.SEARCH_SAMPLE_SIZE} 
                        name="searchSampleSize"
                        value={settingData.searchSampleSize}
                        onChange={handleChange}
                        min={1} max={10}/>
                </Form.Group>

                {/* Highlight Colors */}
                <Form.Group>
                    <OverlayTrigger
                        delay={{ show: 350, hide: 200 }}
                        overlay={<Tooltip>Colors marking known downloads</Tooltip>}>

                        <Form.Label>Highlights</Form.Label>
                        
                    </OverlayTrigger>
                    
                    
                    <Col className="ps-5 text-md">
                        <Form.Group as={Row}>
                            <Row>
                                <Col className="d-flex align-items-center">
                                    <Form.Label>Uncertain</Form.Label>
                                </Col>
                                <Col className="d-flex justify-content-begin align-items-center">
                                    <Form.Control
                                        className="bg-dark"
                                        type="color"                                        
                                        name="uncertainColor"
                                        value={settingData.highlights.uncertainColor}
                                        onChange={handleChange}
                                        title="Pick a color for uncertain downloads"/>
                                </Col>
                            </Row>
                        </Form.Group>
                        
                        <Form.Group as={Row}>
                            <Row>
                                <Col className="d-flex align-items-center">
                                    <Form.Label>Low</Form.Label>
                                </Col>
                                <Col className="d-flex justify-content-begin align-items-center">
                                    <Form.Control
                                        className="bg-dark"
                                        type="color"
                                        name="lowCertaintyColor"
                                        value={settingData.highlights.lowCertaintyColor}
                                        onChange={handleChange}
                                        title="Pick a color for low-certainty downloads"/>
                                </Col>
                            </Row>
                        </Form.Group>

                        <Form.Group as={Row}>
                            <Row>
                                <Col className="d-flex align-items-center">
                                    <Form.Label>Mid</Form.Label>
                                </Col>
                                <Col className="d-flex justify-content-begin align-items-center">
                                    <Form.Control
                                        className="bg-dark"
                                        type="color"
                                        name="midCertaintyColor"
                                        value={settingData.highlights.midCertaintyColor}
                                        onChange={handleChange}
                                        title="Pick a color for mid-certainty downloads"/>
                                </Col>
                            </Row>
                        </Form.Group>
                        
                        <Form.Group as={Row}>
                            <Row>
                                <Col className="d-flex align-items-center">
                                    <Form.Label>High</Form.Label>
                                </Col>
                                <Col className="d-flex justify-content-begin align-items-center">
                                    <Form.Control
                                        className="bg-dark"
                                        type="color"
                                        name="highCertaintyColor"
                                        value={settingData.highlights.highCertaintyColor}
                                        onChange={handleChange}
                                        title="Pick a color for high-certainty downloads"/>
                                </Col>
                            </Row>
                        </Form.Group>
                    </Col>

                </Form.Group>
            </Row>
            
            <Row xs={2} className="m-0 pt-4">
                <Col>
                    <Button className="w-100" 
                        variant="primary" type="submit">
                        Save
                    </Button>
                </Col>
                <Col>
                    <Button className="w-100" 
                        variant="secondary" type="reset">
                        Cancel
                    </Button>
                </Col>
            </Row>

        </Form>
    );
}

export default SettingsScreen;
