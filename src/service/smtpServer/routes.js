import wkdController from '../../controller/wkdController';
import wksController from '../../controller/wksController';

export default function setupRoutes(app) {
    // WKD
    app.get('/\.well-known/openpgpkey/:domain/hu/:hash', wkdController.getPublicKey);
    app.get('/\.well-known/openpgpkey/:domain/submission-address', wkdController.getSubmissionAddress);

    // WKS
    app.get('/api/:token', wksController.publishKey);

    // Keyserver
    // to be continued...
    
    // Default Page
    app.get("*", (req, res) => {
        console.log(req);
        res.status(404).send("PAGE NOT FOUND");
    });
}