import express from 'express';
import {getVideoComments, addComment, updateComment,deleteComment} from '../controllers/comment.controller.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.use(verifyJWT);

router.route('/VideoComments/:videoId').get(getVideoComments)
router.route('/comment/:videoId').post(addComment)
router.route('/update/:commentId').patch(updateComment)
router.route('/delete/:commentId').delete(deleteComment)

export default router;