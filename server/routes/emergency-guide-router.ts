import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import multer from 'multer';
import AdmZip from 'adm-zip';
import fetch from 'node-fetch';


const router = express.Router();
// 遏･隴倥・繝ｼ繧ｹ繝・ぅ繝ｬ繧ｯ繝医Μ縺ｮ險ｭ螳・- uploads繝輔か繝ｫ繝縺ｮ菴ｿ逕ｨ繧貞ｻ・ｭ｢
const knowledgeBaseDir: any = path.resolve('./knowledge-base');
const kbPptDir: any = path.join(knowledgeBaseDir, 'ppt');
const kbJsonDir: any = path.join(knowledgeBaseDir, 'json');
const kbImageDir: any = path.join(knowledgeBaseDir, 'images');
const kbTempDir: any = path.join(knowledgeBaseDir, 'temp');
// 繝・ぅ繝ｬ繧ｯ繝医Μ縺ｮ蟄伜惠遒ｺ隱阪→菴懈・
[knowledgeBaseDir, kbPptDir, kbJsonDir, kbImageDir, kbTempDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});
// 繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・蜃ｦ逅・ｼ壼撫鬘後→縺ｪ繧九ヵ繧｡繧､繝ｫ繧貞炎髯､ (髢狗匱逕ｨ)
const cleanupSpecificFiles = () => {
  try {
    // 蝠城｡後・縺ゅｋ繧ｬ繧､繝峨ヵ繧｡繧､繝ｫ繧堤｢ｺ隱阪＠縺ｦ蜑企勁
    const problemFile: any = path.join(
      kbJsonDir,
      'guide_1744876404679_metadata.json'
    );
    if (fs.existsSync(problemFile)) {
      console.console.log('蝠城｡後→縺ｪ繧九ヵ繧｡繧､繝ｫ繧貞炎髯､縺励∪縺・', problemFile);
      fs.unlinkSync(problemFile);
    }
    // 髢｢騾｣縺吶ｋ逕ｻ蜒上ｒ蜑企勁
    if (fs.existsSync(kbImageDir)) {
      const imageFiles: any = fs.readdirSync(kbImageDir);
      const relatedImages: any = imageFiles.filter(img =>
        img.startsWith('guide_1744876404679')
      );
      relatedImages.forEach(imgFile => {
        const imgPath: any = path.join(kbImageDir, imgFile);
        if (fs.existsSync(imgPath)) {
          fs.unlinkSync(imgPath);
          console.console.log('髢｢騾｣逕ｻ蜒上ｒ蜑企勁縺励∪縺励◆:', imgPath);
        }
      });
    }
  } catch (error) {
    console.error('繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆:', error);
  }
};
// 繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ襍ｷ蜍墓凾縺ｫ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・繧貞ｮ溯｡・
cleanupSpecificFiles();
// Multer縺ｮ險ｭ螳・
const storage: any = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, kbPptDir);
  },
  filename: (_req, file, cb) => {
    const timestamp: any = Date.now();
    const originalName: any = file.originalname;
    const extension: any = path.extname(originalName);
    const fileName = `guide_${timestamp}${extension}`;
    cb(null, fileName);
  },
});
// 繝輔ぃ繧､繝ｫ繝輔ぅ繝ｫ繧ｿ繝ｼ・・PTX縲￣DF縺ｨJSON繧定ｨｱ蜿ｯ・・
const fileFilter = (_req: any, file: any, cb) => {
  const allowedExtensions = ['.pptx', '.ppt', '.pdf', '.xlsx', '.xls', '.json'];
  const ext: any = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        '繧ｵ繝昴・繝医＆繧後※縺・↑縺・ヵ繧｡繧､繝ｫ蠖｢蠑上〒縺吶１owerPoint (.pptx, .ppt)縲・xcel (.xlsx, .xls)縲￣DF (.pdf)縲√∪縺溘・JSON (.json) 繝輔ぃ繧､繝ｫ縺ｮ縺ｿ繧｢繝・・繝ｭ繝ｼ繝峨〒縺阪∪縺吶・
      )
    );
  }
};
const upload: any = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
});
// PowerPoint・・PTX・峨ヵ繧｡繧､繝ｫ繧貞・逅・＠縺ｦJSON繝・・繧ｿ縺ｫ螟画鋤縺吶ｋ髢｢謨ｰ
async function processPowerPointFile(filePath) {
  try {
    const fileId = `guide_${Date.now()}`;
    const fileExtension: any = path.extname(filePath);
    // PPTX繝輔ぃ繧､繝ｫ繧定ｧ｣蜃阪＠縺ｦXML縺ｨ縺励※蜃ｦ逅・
    if (fileExtension.toLowerCase() === '.pptx') {
      const zip: any = new AdmZip(filePath);
      const extractDir: any = path.join(kbTempDir, fileId);
      // 荳譎ゅョ繧｣繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺励↑縺・ｴ蜷医・菴懈・
      if (!fs.existsSync(kbTempDir)) {
        fs.mkdirSync(kbTempDir, { recursive: true });
      }
      if (!fs.existsSync(extractDir)) {
        fs.mkdirSync(extractDir, { recursive: true });
      }
      // ZIP縺ｨ縺励※螻暮幕
      zip.extractAllTo(extractDir, true);
      // 繧ｹ繝ｩ繧､繝厩ML繝輔ぃ繧､繝ｫ繧呈爾縺・
      const slidesDir: any = path.join(extractDir, 'ppt', 'slides');
      const slideFiles: any = fs.existsSync(slidesDir)
        ? fs
            .readdirSync(slidesDir)
            .filter(file => file.startsWith('slide') && file.endsWith('.xml'))
        : [];
      // 繧ｹ繝ｩ繧､繝峨・繝・く繧ｹ繝亥・螳ｹ繧呈歓蜃ｺ
      const slides = [];
      for (let i = 0; i < slideFiles.length; i++) {
        const slideNumber: any = i + 1;
        const slideFilePath: any = path.join(slidesDir, slideFiles[i]);
        const slideContent: any = fs.readFileSync(slideFilePath, 'utf8');
        // 逕ｻ蜒上・蜿ら・繧呈爾縺・
        const imageRefs = [];
        const imageRegex = /r:embed="rId(\d+)"/g;
        let match;
        while ((match = imageRegex.exec(slideContent)) !== null) {
          imageRefs.push(match[1]);
        }
        // 繝・く繧ｹ繝亥・螳ｹ縺ｮ謚ｽ蜃ｺ
        const textRegex = /<a:t>(.*?)<\/a:t>/g;
        const texts = [];
        while ((match = textRegex.exec(slideContent)) !== null) {
          if (match[1].trim()) {
            texts.push(match[1].trim());
          }
        }
        // 繝弱・繝茨ｼ医せ繝斐・繧ｫ繝ｼ繝弱・繝茨ｼ峨・蜀・ｮｹ繧貞叙蠕・
        const noteFilePath: any = path.join(
          extractDir,
          'ppt',
          'notesSlides',
          `notesSlide${slideNumber}.xml`
        );
        let noteContent = '';
        if (fs.existsSync(noteFilePath)) {
          const noteXml: any = fs.readFileSync(noteFilePath, 'utf8');
          const noteRegex = /<a:t>(.*?)<\/a:t>/g;
          while ((match = noteRegex.exec(noteXml)) !== null) {
            if (match[1].trim()) {
              noteContent += match[1].trim() + '\n';
            }
          }
        }
        // 繝｡繝・ぅ繧｢繝輔ぃ繧､繝ｫ繧呈爾縺励※菫晏ｭ・
        const imageTexts = [];
        const mediaDir: any = path.join(extractDir, 'ppt', 'media');
        if (fs.existsSync(mediaDir)) {
          const mediaFiles: any = fs.readdirSync(mediaDir);
          // 蜷・判蜒上ヵ繧｡繧､繝ｫ繧貞・逅・
          for (const mediaFile of mediaFiles) {
            const sourcePath: any = path.join(mediaDir, mediaFile);
            const targetFileName = `${fileId}_slide${slideNumber}_${mediaFile}`;
            const targetPath: any = path.join(kbImageDir, targetFileName);
            // 逕ｻ蜒上ｒ繧ｳ繝斐・
            fs.copyFileSync(sourcePath, targetPath);
            // 逕ｻ蜒上ヱ繧ｹ縺ｮ菴懈・・育嶌蟇ｾ繝代せ・・
            const relativePath = `/knowledge-base/images/${targetFileName}`;
            // 逕ｻ蜒上↓髢｢騾｣縺吶ｋ繝・く繧ｹ繝医ｒ隕九▽縺代ｋ・育判蜒上・霑代￥縺ｮ繝・く繧ｹ繝郁ｦ∫ｴ縺九ｉ・・
            const imageText: any =
              texts.length > 0 ? texts[0] : '逕ｻ蜒上・隱ｬ譏弱′縺ゅｊ縺ｾ縺帙ｓ';
            imageTexts.push({
              逕ｻ蜒上ヱ繧ｹ: relativePath,
              繝・く繧ｹ繝・ imageText,
            });
          }
        }
        // 繧ｹ繝ｩ繧､繝峨ョ繝ｼ繧ｿ縺ｮ讒狗ｯ・
        slides.push({
          繧ｹ繝ｩ繧､繝臥分蜿ｷ: slideNumber,
          繧ｿ繧､繝医Ν: texts.length > 0 ? texts[0] : `繧ｹ繝ｩ繧､繝・${slideNumber}`,
          譛ｬ譁・ texts.slice(1), // 蜈磯ｭ・医ち繧､繝医Ν・我ｻ･螟悶・繝・く繧ｹ繝・
          繝弱・繝・ noteContent,
          逕ｻ蜒上ユ繧ｭ繧ｹ繝・ imageTexts,
        });
      }
      // 繝励Ξ繧ｼ繝ｳ繝・・繧ｷ繝ｧ繝ｳ縺ｮ繝｡繧ｿ繝・・繧ｿ繧貞叙蠕・
      const corePropsPath: any = path.join(extractDir, 'docProps', 'core.xml');
      let title = path.basename(filePath, fileExtension);
      let creator = '';
      let created = new Date().toISOString();
      let modified = new Date().toISOString();
      if (fs.existsSync(corePropsPath)) {
        const coreProps: any = fs.readFileSync(corePropsPath, 'utf8');
        // 繧ｿ繧､繝医Ν繧貞叙蠕・
        const titleMatch = /<dc:title>(.*?)<\/dc:title>/g.exec(coreProps);
        if (titleMatch && titleMatch[1]) {
          title = titleMatch[1];
        }
        // 菴懈・閠・ｒ蜿門ｾ・
        const creatorMatch = /<dc:creator>(.*?)<\/dc:creator>/g.exec(coreProps);
        if (creatorMatch && creatorMatch[1]) {
          creator = creatorMatch[1];
        }
        // 菴懈・譌･繧貞叙蠕・
        const createdMatch = /<dcterms:created>(.*?)<\/dcterms:created>/g.exec(
          coreProps
        );
        if (createdMatch && createdMatch[1]) {
          created = createdMatch[1];
        }
        // 譖ｴ譁ｰ譌･繧貞叙蠕・
        const modifiedMatch =
          /<dcterms:modified>(.*?)<\/dcterms:modified>/g.exec(coreProps);
        if (modifiedMatch && modifiedMatch[1]) {
          modified = modifiedMatch[1];
        }
      }
      // 荳譎ゅョ繧｣繝ｬ繧ｯ繝医Μ繧貞炎髯､
      fs.rmSync(extractDir, { recursive: true, force: true });
      // 譛邨ら噪縺ｪJSON繧ｪ繝悶ず繧ｧ繧ｯ繝医ｒ菴懈・
      const result = {
        metadata: {
          繧ｿ繧､繝医Ν: title,
          菴懈・閠・ creator || 'Unknown',
          菴懈・譌･: created,
          菫ｮ豁｣譌･: modified,
          隱ｬ譏・ `PowerPoint縺九ｉ逕滓・縺輔ｌ縺溷ｿ懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨・{title}縲阪〒縺吶よ磁邯夂分蜿ｷ: 123`,
        },
        slides,
      };
      // JSON繝輔ぃ繧､繝ｫ繧堤衍隴倥・繝ｼ繧ｹ繝・ぅ繝ｬ繧ｯ繝医Μ縺ｫ菫晏ｭ・
      const kbJsonFilePath: any = path.join(
        kbJsonDir,
        `${fileId}_metadata.json`
      );
      fs.writeFileSync(kbJsonFilePath, JSON.stringify(result, null, 2));
      return {
        id: fileId,
        filePath: kbJsonFilePath,
        fileName: path.basename(filePath),
        title,
        createdAt: new Date().toISOString(),
        slideCount: slides.length,
        data: result,
      };
    } else {
      throw new Error('繧ｵ繝昴・繝医＆繧後※縺・↑縺・ヵ繧｡繧､繝ｫ蠖｢蠑上〒縺・);
    }
  } catch (error) {
    console.error('PowerPoint繝輔ぃ繧､繝ｫ蜃ｦ逅・お繝ｩ繝ｼ:', error);
    throw error;
  }
}
// JSON繝輔ぃ繧､繝ｫ繧貞・逅・☆繧矩未謨ｰ
async function processJsonFile(filePath) {
  try {
    const fileId = `guide_${Date.now()}`;
    console.console.log(`JSON繝輔ぃ繧､繝ｫ蜃ｦ逅・ ID=${fileId}`);
    // 遏･隴倥・繝ｼ繧ｹ繝・ぅ繝ｬ繧ｯ繝医Μ縺悟ｭ伜惠縺吶ｋ縺薙→繧堤｢ｺ隱・
    if (!fs.existsSync(kbJsonDir)) {
      fs.mkdirSync(kbJsonDir, { recursive: true });
      console.console.log(`遏･隴倥・繝ｼ繧ｹJSON繝・ぅ繝ｬ繧ｯ繝医Μ繧剃ｽ懈・: ${kbJsonDir}`);
    }
    const fileContent: any = fs.readFileSync(filePath, 'utf8');
    const jsonData: any = JSON.parse(fileContent);
    // 繝輔ぃ繧､繝ｫ繝代せ縺ｨ繝輔ぃ繧､繝ｫ蜷阪ｒ繝ｭ繧ｰ蜃ｺ蜉・
    console.console.log(`蜈・・繝輔ぃ繧､繝ｫ繝代せ: ${filePath}`);
    console.console.log(`蜈・・繝輔ぃ繧､繝ｫ蜷・ ${path.basename(filePath)}`);
    // 繧｢繝・・繝ｭ繝ｼ繝峨＆繧後◆逕ｻ蜒上ヱ繧ｹ縺後≠繧句ｴ蜷医∫嶌蟇ｾ繝代せ縺ｫ螟画鋤
    if (jsonData.steps) {
      for (const step of jsonData.steps) {
        if (step.imageUrl && step.imageUrl.startsWith('/uploads/')) {
          step.imageUrl = step.imageUrl.replace(
            '/uploads/',
            '/knowledge-base/'
          );
        }
      }
    }
    // 遏･隴倥・繝ｼ繧ｹ繝・ぅ繝ｬ繧ｯ繝医Μ縺ｫ荳邂・園縺縺台ｿ晏ｭ假ｼ育判蜒上ヱ繧ｹ縺ｯ繝翫Ξ繝・ず繝吶・繧ｹ縺ｮ逶ｸ蟇ｾ繝代せ繧剃ｽｿ逕ｨ・・
    const kbJsonFilePath: any = path.join(kbJsonDir, `${fileId}_metadata.json`);
    console.console.log(`菫晏ｭ伜・繝輔ぃ繧､繝ｫ繝代せ: ${kbJsonFilePath}`);
    // JSON繝・・繧ｿ繧呈枚蟄怜・縺ｫ螟画鋤縺励※菫晏ｭ假ｼ医さ繝斐・縺ｧ縺ｯ縺ｪ縺乗嶌縺崎ｾｼ縺ｿ・・
    fs.writeFileSync(kbJsonFilePath, JSON.stringify(jsonData, null, 2));
    console.console.log(`繝輔ぃ繧､繝ｫ繧剃ｿ晏ｭ倥＠縺ｾ縺励◆: ${kbJsonFilePath}`);
    // 繧ｿ繧､繝医Ν縺ｪ縺ｩ縺ｮ諠・ｱ繧貞叙蠕・
    const title: any = jsonData.title || path.basename(filePath, '.json');
    const slideCount: any = jsonData.steps ? jsonData.steps.length : 0;
    return {
      id: fileId,
      filePath: kbJsonFilePath,
      fileName: path.basename(filePath),
      title,
      createdAt: new Date().toISOString(),
      slideCount,
      data: jsonData,
    };
  } catch (error) {
    console.error('JSON繝輔ぃ繧､繝ｫ蜃ｦ逅・お繝ｩ繝ｼ:', error);
    throw error;
  }
}
// 繝輔ぃ繧､繝ｫ繧｢繝・・繝ｭ繝ｼ繝峨→蜃ｦ逅・・繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
router.post('/process', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({
          success: false,
          error: '繝輔ぃ繧､繝ｫ縺後い繝・・繝ｭ繝ｼ繝峨＆繧後※縺・∪縺帙ｓ',
        });
    }
    // 閾ｪ蜍輔ヵ繝ｭ繝ｼ逕滓・繧ｪ繝励す繝ｧ繝ｳ繧貞叙蠕・
    const autoGenerateFlow: any = req.body.autoGenerateFlow === 'true';
    const filePath: any = req.file.path;
    const fileExtension: any = path.extname(filePath).toLowerCase();
    let result;
    // 繝輔ぃ繧､繝ｫ蠖｢蠑上↓蠢懊§縺溷・逅・
    if (fileExtension === '.json') {
      console.log(`JSON繝輔ぃ繧､繝ｫ蜃ｦ逅・ ${filePath}`);
      result = await processJsonFile(filePath);
    } else if (['.pptx', '.ppt'].includes(fileExtension)) {
      console.log(`PowerPoint繝輔ぃ繧､繝ｫ蜃ｦ逅・ ${filePath}`);
      result = await processPowerPointFile(filePath);
    } else {
      return res.status(400).json({
        success: false,
        error:
          '繧ｵ繝昴・繝医＆繧後※縺・↑縺・ヵ繧｡繧､繝ｫ蠖｢蠑上〒縺吶ら樟蝨ｨ縺ｮ蜃ｦ逅・・PowerPoint縺ｨJSON縺ｮ縺ｿ繧ｵ繝昴・繝医＠縺ｦ縺・∪縺吶・,
      });
    }
    // JSON縺ｫ菫晏ｭ倥＆繧後※縺・ｋ逕ｻ蜒上ヱ繧ｹ縺後リ繝ｬ繝・ず繝吶・繧ｹ蠖｢蠑上↓螟画鋤縺輔ｌ縺ｦ縺・ｋ縺薙→繧堤｢ｺ隱・
    if (fileExtension === '.json') {
      // 繝翫Ξ繝・ず繝吶・繧ｹ繝・ぅ繝ｬ繧ｯ繝医Μ縺ｮ繝代せ繧堤｢ｺ菫・
      const knowledgeBaseDir: any = path.join('knowledge-base');
      if (!fs.existsSync(knowledgeBaseDir)) {
        fs.mkdirSync(knowledgeBaseDir, { recursive: true });
      }
      const knowledgeBaseImagesDir: any = path.join(knowledgeBaseDir, 'images');
      if (!fs.existsSync(knowledgeBaseImagesDir)) {
        fs.mkdirSync(knowledgeBaseImagesDir, { recursive: true });
      }
    }
    // 繝ｬ繧ｹ繝昴Φ繧ｹ逕ｨ縺ｮ繝・・繧ｿ
    const responseData = {
      success: true,
      message: '繝輔ぃ繧､繝ｫ縺梧ｭ｣蟶ｸ縺ｫ蜃ｦ逅・＆繧後∪縺励◆',
      guideId: result.id,
      data: result,
    };
    // 閾ｪ蜍輔ヵ繝ｭ繝ｼ逕滓・縺梧怏蜉ｹ縺ｪ蝣ｴ蜷医・縲・撼蜷梧悄縺ｧ繝輔Ο繝ｼ逕滓・繝励Ο繧ｻ繧ｹ繧帝幕蟋・
    if (autoGenerateFlow) {
      // 縺ｾ縺壹Ξ繧ｹ繝昴Φ繧ｹ繧定ｿ斐＠縺ｦ繧ｯ繝ｩ繧､繧｢繝ｳ繝医ｒ蠕・◆縺帙↑縺・
      res.json(responseData);
      try {
        console.console.log(`閾ｪ蜍輔ヵ繝ｭ繝ｼ逕滓・繧帝幕蟋・ ${result.id}`);
        // 蛻･繝励Ο繧ｻ繧ｹ縺ｧ繝輔Ο繝ｼ逕滓・API繧貞他縺ｳ蜃ｺ縺呻ｼ医ヰ繝・け繧ｰ繝ｩ繧ｦ繝ｳ繝牙・逅・ｼ・
        fetch(
          `http://localhost:${process.env.PORT || 3000}/api/flow-generator/generate-from-guide/${result.id}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
          }
        )
          .then(async response => {
            if (response.ok) {
              const generationResult: any = await response.json();
              console.console.log(`繝輔Ο繝ｼ逕滓・謌仙粥: ${generationResult.flowData.id}`);
            } else {
              console.error('繝輔Ο繝ｼ逕滓・繧ｨ繝ｩ繝ｼ:', await response.text());
            }
          })
          .catch(err => {
            console.error('繝輔Ο繝ｼ逕滓・繝ｪ繧ｯ繧ｨ繧ｹ繝医お繝ｩ繝ｼ:', err);
          });
      } catch (error) {
        console.error('閾ｪ蜍輔ヵ繝ｭ繝ｼ逕滓・髢句ｧ九お繝ｩ繝ｼ:', error);
        // 繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｦ繧ゅけ繝ｩ繧､繧｢繝ｳ繝医↓縺ｯ譌｢縺ｫ繝ｬ繧ｹ繝昴Φ繧ｹ繧定ｿ斐＠縺ｦ縺・ｋ縺ｮ縺ｧ菴輔ｂ縺励↑縺・
      }
      // 繝ｬ繧ｹ繝昴Φ繧ｹ縺ｯ譌｢縺ｫ霑斐＠縺ｦ縺・ｋ縺ｮ縺ｧ縺薙％縺ｧ縺ｯ菴輔ｂ縺励↑縺・
      return;
    }
    // 閾ｪ蜍輔ヵ繝ｭ繝ｼ逕滓・縺檎┌蜉ｹ縺ｪ蝣ｴ蜷医・騾壼ｸｸ縺ｮ繝ｬ繧ｹ繝昴Φ繧ｹ繧定ｿ斐☆
    return res.json(responseData);
  } catch (error) {
    console.error('繝輔ぃ繧､繝ｫ蜃ｦ逅・お繝ｩ繝ｼ:', error);
    return res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : '荳肴・縺ｪ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆',
    });
  }
});
// 繧ｬ繧､繝峨ヵ繧｡繧､繝ｫ荳隕ｧ繧貞叙蠕励☆繧九お繝ｳ繝峨・繧､繝ｳ繝・
router.get('/list', (_req, res) => {
  try {
    console.console.log('繧ｬ繧､繝我ｸ隕ｧ繧貞叙蠕励＠縺ｾ縺・..');
    // 遏･隴倥・繝ｼ繧ｹ繝・ぅ繝ｬ繧ｯ繝医Μ縺九ｉ繝輔ぃ繧､繝ｫ繧定ｪｭ縺ｿ蜿悶ｋ
    if (!fs.existsSync(kbJsonDir)) {
      return res.status(404).json({ error: '繝・ぅ繝ｬ繧ｯ繝医Μ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ' });
    }
    // 繧ｭ繝｣繝・す繝･繝舌せ繝・ぅ繝ｳ繧ｰ縺ｮ縺溘ａ縺ｫ繝輔ぃ繧､繝ｫ荳隕ｧ繧貞・繧ｹ繧ｭ繝｣繝ｳ
    const allFiles: any = fs.readdirSync(kbJsonDir);
    console.console.log('蜈ｨ繝輔ぃ繧､繝ｫ荳隕ｧ:', allFiles);
    // 迚ｹ螳壹・繝輔ぃ繧､繝ｫ繧帝勁螟悶☆繧九◆繧√・繝悶Λ繝・け繝ｪ繧ｹ繝・
    const blacklist = ['guide_1744876404679_metadata.json'];
    // 繝｡繧ｿ繝・・繧ｿ繝輔ぃ繧､繝ｫ縺ｮ縺ｿ繧偵ヵ繧｣繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ・医°縺､繝悶Λ繝・け繝ｪ繧ｹ繝医ｒ髯､螟厄ｼ・
    const files: any = allFiles.filter(
      file => file.endsWith('_metadata.json') && !blacklist.includes(file)
    );
    console.console.log('繝輔ぅ繝ｫ繧ｿ繝ｪ繝ｳ繧ｰ蠕後・繝｡繧ｿ繝・・繧ｿ繝輔ぃ繧､繝ｫ荳隕ｧ:', files);
    const guides: any = files.map(file => {
      try {
        const filePath: any = path.join(kbJsonDir, file);
        const content: any = fs.readFileSync(filePath, 'utf8');
        const data: any = JSON.parse(content);
        const id: any = file.split('_')[0] + '_' + file.split('_')[1];
        // JSON繝・・繧ｿ縺ｮ蠖｢蠑上↓蠢懊§縺ｦ蜃ｦ逅・
        // 騾壼ｸｸ縺ｮPowerPoint逕ｱ譚･縺ｮ蠖｢蠑・
        if (data.metadata && data.slides) {
          return {
            id,
            filePath,
            fileName: data.metadata.繧ｿ繧､繝医Ν || `繝輔ぃ繧､繝ｫ_${id}`,
            title: data.metadata.繧ｿ繧､繝医Ν || `繝輔ぃ繧､繝ｫ_${id}`,
            createdAt: data.metadata.菴懈・譌･,
            slideCount: data.slides.length,
          };
        }
        // JSON逕ｱ譚･縺ｮ蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ蠖｢蠑・
        else if (data.title && data.steps) {
          return {
            id,
            filePath,
            fileName: data.title || `繝輔Ο繝ｼ_${id}`,
            title: data.title || `繝輔Ο繝ｼ_${id}`,
            createdAt: data.createdAt || new Date().toISOString(),
            slideCount: data.steps.length,
          };
        }
        // 縺昴・莉悶・蠖｢蠑上・蝣ｴ蜷医・繝輔ぃ繧､繝ｫ蜷阪ｒ繧ｿ繧､繝医Ν縺ｨ縺励※菴ｿ逕ｨ
        else {
          return {
            id,
            filePath,
            fileName: `繝輔ぃ繧､繝ｫ_${id}`,
            title: `繝輔ぃ繧､繝ｫ_${id}`,
            createdAt: new Date().toISOString(),
            slideCount: 0,
          };
        }
      } catch (err) {
        console.error(`繝輔ぃ繧､繝ｫ蜃ｦ逅・お繝ｩ繝ｼ: ${file}`, err);
        // 繧ｨ繝ｩ繝ｼ縺ｮ蝣ｴ蜷医・譛菴朱剞縺ｮ諠・ｱ繧定ｿ斐☆
        const id: any = file.split('_')[0] + '_' + file.split('_')[1];
        return {
          id,
          filePath: path.join(kbJsonDir, file),
          fileName: `繧ｨ繝ｩ繝ｼ繝輔ぃ繧､繝ｫ_${id}`,
          title: `繧ｨ繝ｩ繝ｼ繝輔ぃ繧､繝ｫ_${id}`,
          createdAt: new Date().toISOString(),
          slideCount: 0,
        };
      }
    });
    // 繝ｪ繧ｹ繝亥叙蠕怜燕縺ｮ譛邨ら憾諷九メ繧ｧ繝・け・亥ｮ悟・縺ｫ繝輔ぃ繧､繝ｫ繧ｷ繧ｹ繝・Β縺ｨ蜷梧悄縺吶ｋ縺溘ａ・・
    console.console.log('蠢懈･繧ｬ繧､繝我ｸ隕ｧ繧偵Ξ繧ｹ繝昴Φ繧ｹ騾∽ｿ｡蜑阪↓譛邨よ､懆ｨｼ:');
    console.console.log('- JSON繝・ぅ繝ｬ繧ｯ繝医Μ縺ｮ蜀・ｮｹ:', fs.readdirSync(kbJsonDir));
    console.console.log('- 霑泌唆縺吶ｋ繧ｬ繧､繝画焚:', guides.length);
    console.console.log('- 繧ｬ繧､繝迂D荳隕ｧ:', guides.map(g => g.id).join(', '));
    // 繝倥ャ繝繝ｼ縺ｮ霑ｽ蜉縺ｧ繧ｭ繝｣繝・す繝･繧堤┌蜉ｹ蛹・
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    // 繝ｬ繧ｹ繝昴Φ繧ｹ繧定ｿ斐☆
    res.json(guides);
  } catch (error) {
    console.error('繧ｬ繧､繝我ｸ隕ｧ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({ error: '繧ｬ繧､繝我ｸ隕ｧ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆' });
  }
});
// 迚ｹ螳壹・繧ｬ繧､繝芽ｩｳ邏ｰ繝・・繧ｿ繧貞叙蠕励☆繧九お繝ｳ繝峨・繧､繝ｳ繝・
router.get('/detail/:id', (_req, res) => {
  try {
    const id: any = req.params.id;
    const files: any = fs
      .readdirSync(kbJsonDir)
      .filter(file => file.startsWith(id) && file.endsWith('_metadata.json'));
    if (files.length === 0) {
      return res.status(404).json({ error: '繧ｬ繧､繝峨′隕九▽縺九ｊ縺ｾ縺帙ｓ' });
    }
    const filePath: any = path.join(kbJsonDir, files[0]);
    const content: any = fs.readFileSync(filePath, 'utf8');
    const data: any = JSON.parse(content);
    // 繧｢繝・・繝ｭ繝ｼ繝峨ヱ繧ｹ(/uploads/)縺九ｉ繝翫Ξ繝・ず繝吶・繧ｹ繝代せ(/knowledge-base/)縺ｸ縺ｮ螟画鋤
    // 繧ｹ繝ｩ繧､繝牙・縺ｮ逕ｻ蜒上ヱ繧ｹ繧呈峩譁ｰ
    if (data.slides && Array.isArray(data.slides)) {
      data.slides.forEach(slide => {
        if (slide.逕ｻ蜒上ユ繧ｭ繧ｹ繝・&& Array.isArray(slide.逕ｻ蜒上ユ繧ｭ繧ｹ繝・) {
          slide.逕ｻ蜒上ユ繧ｭ繧ｹ繝・forEach(imgText => {
            if (imgText.逕ｻ蜒上ヱ繧ｹ && imgText.逕ｻ蜒上ヱ繧ｹ.startsWith('/uploads/')) {
              // 繝代せ繧・knowledge-base縺ｫ鄂ｮ縺肴鋤縺・
              imgText.逕ｻ蜒上ヱ繧ｹ = imgText.逕ｻ蜒上ヱ繧ｹ.replace(
                '/uploads/',
                '/knowledge-base/'
              );
              console.console.log(`逕ｻ蜒上ヱ繧ｹ繧呈峩譁ｰ: ${imgText.逕ｻ蜒上ヱ繧ｹ}`);
            }
          });
        }
      });
    }
    // JSON繝輔ぃ繧､繝ｫ蜀・・繝・・繧ｿ縺御ｿｮ豁｣縺輔ｌ縺溘ｉ繝輔ぃ繧､繝ｫ繧よ峩譁ｰ・医が繝励す繝ｧ繝ｳ・・
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.json({
      id,
      filePath,
      fileName: files[0],
      data,
    });
  } catch (error) {
    console.error('繧ｬ繧､繝芽ｩｳ邏ｰ蜿門ｾ励お繝ｩ繝ｼ:', error);
    res.status(500).json({ error: '繧ｬ繧､繝芽ｩｳ邏ｰ縺ｮ蜿門ｾ励↓螟ｱ謨励＠縺ｾ縺励◆' });
  }
});
// 繧ｬ繧､繝峨ョ繝ｼ繧ｿ繧呈峩譁ｰ縺吶ｋ繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
router.post('/update/:id', (_req, res) => {
  try {
    const id: any = req.params.id;
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ error: '繝・・繧ｿ縺梧署萓帙＆繧後※縺・∪縺帙ｓ' });
    }
    const files: any = fs
      .readdirSync(kbJsonDir)
      .filter(file => file.startsWith(id) && file.endsWith('_metadata.json'));
    if (files.length === 0) {
      return res.status(404).json({ error: '繧ｬ繧､繝峨′隕九▽縺九ｊ縺ｾ縺帙ｓ' });
    }
    const filePath: any = path.join(kbJsonDir, files[0]);
    // 譖ｴ譁ｰ譌･譎ゅｒ迴ｾ蝨ｨ縺ｮ譌･譎ゅ↓險ｭ螳・
    if (data.metadata) {
      data.metadata.菫ｮ豁｣譌･ = new Date().toISOString();
    }
    // 繝輔ぃ繧､繝ｫ縺ｫ譖ｸ縺崎ｾｼ縺ｿ
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.json({
      success: true,
      message: '繧ｬ繧､繝峨ョ繝ｼ繧ｿ縺梧峩譁ｰ縺輔ｌ縺ｾ縺励◆',
      id,
    });
  } catch (error) {
    console.error('繧ｬ繧､繝画峩譁ｰ繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({ error: '繧ｬ繧､繝峨・譖ｴ譁ｰ縺ｫ螟ｱ謨励＠縺ｾ縺励◆' });
  }
});
// 繧ｬ繧､繝峨ョ繝ｼ繧ｿ繧貞炎髯､縺吶ｋ繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
router.delete('/delete/:id', async (_req, res) => {
  try {
    const id: any = req.params.id;
    console.console.log(`蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝牙炎髯､繝ｪ繧ｯ繧ｨ繧ｹ繝・ ID=${id}`);
    // 遏･隴倥・繝ｼ繧ｹJson・医Γ繧ｿ繝・・繧ｿ・峨ョ繧｣繝ｬ繧ｯ繝医Μ縺九ｉ逶ｴ謗･繝輔ぃ繧､繝ｫ繧呈､懃ｴ｢
    if (!fs.existsSync(kbJsonDir)) {
      return res
        .status(404)
        .json({ error: 'JSON繝・ぅ繝ｬ繧ｯ繝医Μ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ' });
    }
    // 縺吶∋縺ｦ縺ｮJSON繝輔ぃ繧､繝ｫ繧呈､懃ｴ｢縺励√・繝・メ縺吶ｋ繧ゅ・繧帝∈謚・
    const jsonFiles: any = fs.readdirSync(kbJsonDir);
    console.console.log(`蜑企勁蜃ｦ逅・ ID=${id}, 繝輔ぃ繧､繝ｫ荳隕ｧ:`, jsonFiles);
    // ID縺ｫ繧医ｋ讀懃ｴ｢譁ｹ豕輔ｒ驕ｸ謚・
    const matchingFiles = [];
    if (id.startsWith('mc_')) {
      // mc_蠖｢蠑上・ID縺ｮ蝣ｴ蜷医・蜴ｳ蟇・↑ID讀懃ｴ｢ (謨ｰ蛟､驛ｨ蛻・〒辣ｧ蜷・
      const idPrefix: any = id.split('_')[1]; // mc_123456 -> 123456
      console.console.log(`mc_繧ｿ繧､繝励・ID讀懃ｴ｢: 繝励Ξ繝輔ぅ繝・け繧ｹ=${idPrefix}`);
      jsonFiles.forEach(file => {
        if (file.includes(idPrefix)) {
          matchingFiles.push(file);
        }
      });
    } else {
      // guide_蠖｢蠑上・ID縺ｯ蜑肴婿荳閾ｴ縺ｧ讀懃ｴ｢
      jsonFiles.forEach(file => {
        if (file.startsWith(id)) {
          matchingFiles.push(file);
        }
      });
    }
    console.console.log(
      `繝槭ャ繝√☆繧九ヵ繧｡繧､繝ｫ (${matchingFiles.length}莉ｶ):`,
      matchingFiles
    );
    if (matchingFiles.length === 0) {
      return res
        .status(404)
        .json({ error: `謖・ｮ壹＆繧後◆繧ｬ繧､繝・(ID: ${id}) 縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ` });
    }
    // 譛蛻昴・繝輔ぃ繧､繝ｫ縺九ｉ繧ｿ繧､繝医Ν諠・ｱ縺ｪ縺ｩ繧貞叙蠕・
    const mainFilePath: any = path.join(kbJsonDir, matchingFiles[0]);
    let title = `繝輔ぃ繧､繝ｫ_${id}`;
    // JSON繝輔ぃ繧､繝ｫ縺ｮ蜀・ｮｹ繧定ｪｭ縺ｿ蜿悶ｊ縲√ち繧､繝医Ν縺ｪ縺ｩ繧貞叙蠕・
    try {
      const content: any = fs.readFileSync(mainFilePath, 'utf8');
      const data: any = JSON.parse(content);
      if (data.metadata && data.metadata.繧ｿ繧､繝医Ν) {
        title = data.metadata.繧ｿ繧､繝医Ν;
      } else if (data.title) {
        title = data.title;
      }
    } catch (readError) {
      console.warn(
        `蜑企勁蜑阪・繝輔ぃ繧､繝ｫ蜀・ｮｹ隱ｭ縺ｿ蜿悶ｊ縺ｫ螟ｱ謨・ ${mainFilePath}`,
        readError
      );
    }
    // 縺吶∋縺ｦ縺ｮ繝槭ャ繝√☆繧九ヵ繧｡繧､繝ｫ繧貞炎髯､
    let deletedCount = 0;
    for (const file of matchingFiles) {
      const filePath: any = path.join(kbJsonDir, file);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.console.log(`JSON繝輔ぃ繧､繝ｫ繧貞炎髯､縺励∪縺励◆: ${filePath}`);
        deletedCount++;
      }
    }
    console.console.log(`蜑企勁縺輔ｌ縺櫟SON繝輔ぃ繧､繝ｫ謨ｰ: ${deletedCount}莉ｶ`);
    // index.json縺九ｉ隧ｲ蠖薙お繝ｳ繝医Μ繧貞炎髯､・亥ｭ伜惠縺吶ｋ蝣ｴ蜷茨ｼ・
    const indexPath: any = path.join(knowledgeBaseDir, 'index.json');
    if (fs.existsSync(indexPath)) {
      try {
        const indexContent: any = fs.readFileSync(indexPath, 'utf8');
        const indexData: any = JSON.parse(indexContent);
        // ID縺ｫ蝓ｺ縺･縺・※繧ｨ繝ｳ繝医Μ繧貞炎髯､
        if (Array.isArray(indexData.guides)) {
          const beforeCount: any = indexData.guides.length;
          indexData.guides = indexData.guides.filter(guide => guide.id !== id);
          const afterCount: any = indexData.guides.length;
          if (beforeCount !== afterCount) {
            fs.writeFileSync(indexPath, JSON.stringify(indexData, null, 2));
            console.console.log(
              `繧､繝ｳ繝・ャ繧ｯ繧ｹ縺九ｉ蜑企勁縺励∪縺励◆: ${beforeCount - afterCount}繧ｨ繝ｳ繝医Μ`
            );
          }
        }
      } catch (indexError) {
        console.warn('繧､繝ｳ繝・ャ繧ｯ繧ｹ縺ｮ譖ｴ譁ｰ縺ｫ螟ｱ謨励＠縺ｾ縺励◆:', indexError);
      }
    }
    // 髢｢騾｣縺吶ｋ逕ｻ蜒上ヵ繧｡繧､繝ｫ繧貞炎髯､
    try {
      if (fs.existsSync(kbImageDir)) {
        const imageFiles: any = fs.readdirSync(kbImageDir);
        const relatedImages: any = imageFiles.filter(img => img.startsWith(id));
        for (const imgFile of relatedImages) {
          const imgPath: any = path.join(kbImageDir, imgFile);
          fs.unlinkSync(imgPath);
          console.console.log(`髢｢騾｣逕ｻ蜒上ｒ蜑企勁縺励∪縺励◆: ${imgPath}`);
        }
      }
    } catch (imgError) {
      console.warn('髢｢騾｣逕ｻ蜒上・蜑企勁荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆:', imgError);
    }
    console.console.log(`蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨ｒ蜑企勁縺励∪縺励◆: ID=${id}, 繧ｿ繧､繝医Ν=${title}`);
    // 蜑企勁蠕後・譛邨ら｢ｺ隱搾ｼ医ヵ繧｡繧､繝ｫ繧ｷ繧ｹ繝・Β繧貞・繝√ぉ繝・け・・
    const remainingFiles: any = fs.readdirSync(kbJsonDir);
    console.console.log('----------- 蜑企勁蠕後・迥ｶ諷・-----------');
    console.console.log('蜑企勁縺励◆ID:', id);
    console.console.log('蜑企勁蠕後・繝・ぅ繝ｬ繧ｯ繝医Μ蜀・ｮｹ:', remainingFiles);
    console.console.log('蜑企勁縺励◆繝輔ぃ繧､繝ｫ:', matchingFiles);
    // 蜑企勁縺御ｸ榊ｮ悟・縺ｪ蝣ｴ蜷医・蠑ｷ蛻ｶ蜀崎ｩｦ陦鯉ｼ域怙螟ｧ3蝗橸ｼ・
    for (let attempt = 0; attempt < 3; attempt++) {
      let allDeleted = true;
      for (const file of matchingFiles) {
        const filePath: any = path.join(kbJsonDir, file);
        if (fs.existsSync(filePath)) {
          allDeleted = false;
          console.console.log(
            `蜑企勁縺御ｸ榊ｮ悟・縺ｪ縺溘ａ蠑ｷ蛻ｶ蜀崎ｩｦ陦・(${attempt + 1}/3): ${filePath}`
          );
          try {
            // 繝輔ぃ繧､繝ｫ繧貞ｼｷ蛻ｶ逧・↓蜑企勁
            fs.unlinkSync(filePath);
            console.console.log(`  竊・蜑企勁謌仙粥: ${filePath}`);
          } catch (e) {
            console.error(`  竊・蜑企勁螟ｱ謨・ ${e}`);
            // 100ms蠕・ｩ溘＠縺ｦ縺九ｉ蜀崎ｩｦ陦・
            await new Promise(resolve => setTimeout(resolve, 100));
            try {
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.console.log(`  竊・2蝗樒岼縺ｮ蜑企勁縺梧・蜉・ ${filePath}`);
              }
            } catch (e2) {
              console.error(`  竊・2蝗樒岼縺ｮ蜑企勁繧ょ､ｱ謨・ ${e2}`);
            }
          }
        }
      }
      if (allDeleted) {
        console.console.log(
          `縺吶∋縺ｦ縺ｮ繝輔ぃ繧､繝ｫ縺梧ｭ｣蟶ｸ縺ｫ蜑企勁縺輔ｌ縺ｾ縺励◆ (隧ｦ陦・ ${attempt + 1}蝗樒岼縺ｧ螳御ｺ・`
        );
        break;
      }
      // 谺｡縺ｮ隧ｦ陦悟燕縺ｫ蟆代＠蠕・ｩ・
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    // 譛邨ゅメ繧ｧ繝・け・医☆縺ｹ縺ｦ縺ｮ隧ｦ陦後′邨ゅｏ縺｣縺溷ｾ鯉ｼ・
    // 髱槫酔譛溘〒蜑企勁繧ｿ繧ｹ繧ｯ繧偵く繝･繝ｼ縺ｫ蜈･繧後ｋ
    setTimeout(() => {
      try {
        for (const file of matchingFiles) {
          const filePath: any = path.join(kbJsonDir, file);
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.console.log(`繝舌ャ繧ｯ繧ｰ繝ｩ繧ｦ繝ｳ繝牙炎髯､: ${filePath}`);
          }
        }
        // 霑ｽ蜉縺ｮ繧ｯ繝ｪ繝ｼ繝ｳ繧｢繝・・: 繝医Λ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ繝・ぅ繝ｬ繧ｯ繝医Μ蜀・・髢｢騾｣繝輔ぃ繧､繝ｫ繧ょ炎髯､
        const troubleshootingDir: any = path.join(
          knowledgeBaseDir,
          'troubleshooting'
        );
        if (fs.existsSync(troubleshootingDir)) {
          const tsFiles: any = fs.readdirSync(troubleshootingDir);
          for (const tsFile of tsFiles) {
            if (tsFile.includes(id.split('_')[1])) {
              const tsFilePath: any = path.join(troubleshootingDir, tsFile);
              fs.unlinkSync(tsFilePath);
              console.console.log(
                `繝舌ャ繧ｯ繧ｰ繝ｩ繧ｦ繝ｳ繝牙炎髯､・医ヨ繝ｩ繝悶Ν繧ｷ繝･繝ｼ繝・ぅ繝ｳ繧ｰ・・ ${tsFilePath}`
              );
            }
          }
        }
      } catch (e) {
        console.error('繝舌ャ繧ｯ繧ｰ繝ｩ繧ｦ繝ｳ繝牙炎髯､繧ｨ繝ｩ繝ｼ:', e);
      }
    }, 1000);
    // 繧ｭ繝｣繝・す繝･繝舌せ繝・ぅ繝ｳ繧ｰ縺ｮ縺溘ａ縺ｮ繝倥ャ繝繝ｼ險ｭ螳・
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json');
    return res.json({
      success: true,
      message: `蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨・{title}縲阪ｒ蜑企勁縺励∪縺励◆`,
      deletedFiles: matchingFiles,
    });
  } catch (error) {
    console.error('繧ｬ繧､繝牙炎髯､繧ｨ繝ｩ繝ｼ:', error);
    res.status(500).json({ error: '繧ｬ繧､繝峨・蜑企勁縺ｫ螟ｱ謨励＠縺ｾ縺励◆' });
  }
});
// 繝√Ε繝・ヨ縺ｫ蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨ｒ騾∽ｿ｡縺吶ｋ繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
// 邱頑･繧ｬ繧､繝峨ョ繝ｼ繧ｿ繧偵メ繝｣繝・ヨ縺ｫ逶ｴ謗･騾∽ｿ｡縺吶ｋ繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
router.post('/send', async (_req, res) => {
  try {
    const { chatId, guideData } = req.body;
    if (!chatId || !guideData) {
      return res.status(400).json({
        success: false,
        message: '繝√Ε繝・ヨID縺ｨ繧ｬ繧､繝峨ョ繝ｼ繧ｿ縺悟ｿ・ｦ√〒縺・,
      });
    }
    // 繝ｭ繧ｰ蜃ｺ蜉帛ｼｷ蛹・
    console.console.log('------------------------------------');
    console.console.log('蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨ョ繝ｼ繧ｿ繧偵メ繝｣繝・ヨ縺ｫ騾∽ｿ｡:');
    console.console.log(`chatId: ${chatId}`);
    console.console.log(`title: ${guideData.title || '辟｡鬘・}`);
    console.console.log(`content: ${guideData.content?.substring(0, 100)}...`);
    console.console.log(`sessionUserId: ${req?.session?.userId || 'unknown'}`);
    console.console.log('------------------------------------');
    // 繝ｦ繝ｼ繧ｶ繝ｼID縺ｮ蜿門ｾ暦ｼ郁ｪ崎ｨｼ貂医∩縺ｧ縺ｪ縺・ｴ蜷医・繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ・・
    const senderId: any = req.session?.userId || 1; // 隱崎ｨｼ縺輔ｌ縺ｦ縺・↑縺・ｴ蜷医・繝・ヵ繧ｩ繝ｫ繝医Θ繝ｼ繧ｶ繝ｼID繧剃ｽｿ逕ｨ
    // 繧ｹ繝医Ξ繝ｼ繧ｸ縺ｮ蜿門ｾ・
    const storage: any = req.app.locals.storage;
    if (!storage) {
      console.error('繧ｹ繝医Ξ繝ｼ繧ｸ縺悟・譛溷喧縺輔ｌ縺ｦ縺・∪縺帙ｓ');
      return res
        .status(500)
        .json({
          success: false,
          message: '繧ｵ繝ｼ繝舌・蜀・Κ繧ｨ繝ｩ繝ｼ: 繧ｹ繝医Ξ繝ｼ繧ｸ縺悟・譛溷喧縺輔ｌ縺ｦ縺・∪縺帙ｓ',
        });
    }
    try {
      // 1. 繝ｦ繝ｼ繧ｶ繝ｼ縺ｮ繧ｬ繧､繝牙・螳ｹ繝｡繝・そ繝ｼ繧ｸ繧剃ｽ懈・
      const userMessage: any = await storage.createMessage({
        chatId: Number(chatId),
        content: guideData.content || guideData.title || '蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝・,
        isAiResponse: false,
        senderId,
      });
      // 2. AI縺ｮ蠢懃ｭ斐Γ繝・そ繝ｼ繧ｸ繧剃ｽ懈・・育｢ｺ隱榊ｿ懃ｭ費ｼ・
      const aiMessage: any = await storage.createMessage({
        chatId: Number(chatId),
        content: `笆 ${guideData.title}\n\n縲仙ｮ滓命縺励◆謇矩・・隧ｳ邏ｰ縲曾n${guideData.content}\n\n縲植I蛻・梵縲曾nAI縺悟・譫舌＠縺溽ｵ先棡繧偵％縺薙↓陦ｨ遉ｺ縺励∪縺吶Ａ,
        isAiResponse: true,
        senderId,
      });
      console.console.log(
        '繝√Ε繝・ヨ繝｡繝・そ繝ｼ繧ｸ繧剃ｽ懈・縺励∪縺励◆:',
        userMessage.id,
        aiMessage.id
      );
      return res.json({
        success: true,
        userMessage,
        aiMessage,
      });
    } catch (dbError) {
      console.error(
        '繝｡繝・そ繝ｼ繧ｸ菴懈・荳ｭ縺ｫ繝・・繧ｿ繝吶・繧ｹ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆:',
        dbError
      );
      return res.status(500).json({
        success: false,
        message: '繝｡繝・そ繝ｼ繧ｸ縺ｮ菫晏ｭ倅ｸｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆',
        error:
          dbError instanceof Error ? dbError.message : '繝・・繧ｿ繝吶・繧ｹ繧ｨ繝ｩ繝ｼ',
      });
    }
  } catch (error) {
    console.error('邱頑･繧ｬ繧､繝蛾∽ｿ｡繧ｨ繝ｩ繝ｼ:', error);
    return res.status(500).json({
      success: false,
      message: '邱頑･繧ｬ繧､繝峨・騾∽ｿ｡荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆',
      error: error instanceof Error ? error.message : '荳肴・縺ｪ繧ｨ繝ｩ繝ｼ',
    });
  }
});
// 繧ｷ繧ｹ繝・Β繝｡繝・そ繝ｼ繧ｸ繧偵メ繝｣繝・ヨ縺ｫ騾∽ｿ｡縺吶ｋ繧ｨ繝ｳ繝峨・繧､繝ｳ繝茨ｼ医ヵ繧ｩ繝ｼ繝ｫ繝舌ャ繧ｯ逕ｨ・・
router.post('/system-message', async (_req, res) => {
  try {
    const { chatId, content, isUserMessage = false } = req.body;
    if (!chatId || !content) {
      return res.status(400).json({
        success: false,
        message: '繝√Ε繝・ヨID縺ｨ繝｡繝・そ繝ｼ繧ｸ蜀・ｮｹ縺悟ｿ・ｦ√〒縺・,
      });
    }
    // 繝ｭ繧ｰ蜃ｺ蜉・
    console.console.log('------------------------------------');
    console.console.log('繧ｷ繧ｹ繝・Β繝｡繝・そ繝ｼ繧ｸ繧偵メ繝｣繝・ヨ縺ｫ騾∽ｿ｡:');
    console.console.log(`chatId: ${chatId}`);
    console.console.log(`content: ${content.substring(0, 100)}...`);
    console.console.log(`isUserMessage: ${isUserMessage}`);
    console.console.log(`sessionUserId: ${req?.session?.userId || 'unknown'}`);
    console.console.log('------------------------------------');
    // 繝ｦ繝ｼ繧ｶ繝ｼID縺ｮ蜿門ｾ暦ｼ郁ｪ崎ｨｼ貂医∩縺ｧ縺ｪ縺・ｴ蜷医・繝輔か繝ｼ繝ｫ繝舌ャ繧ｯ・・
    const senderId: any = req.session?.userId || 1;
    // DB繧ｹ繝医Ξ繝ｼ繧ｸ縺檎峩謗･菴ｿ逕ｨ蜿ｯ閭ｽ縺狗｢ｺ隱・
    try {
      const { storage } = await import('../storage.js');
      // 繝｡繝・そ繝ｼ繧ｸ繧剃ｽ懈・
      const message: any = await storage.createMessage({
        chatId: Number(chatId),
        content,
        senderId: senderId,
        isUserMessage: isUserMessage,
        timestamp: new Date(),
      });
      console.console.log('繧ｷ繧ｹ繝・Β繝｡繝・そ繝ｼ繧ｸ繧剃ｽ懈・縺励∪縺励◆:', message.id);
      return res.json({
        success: true,
        message,
      });
    } catch (storageError) {
      console.error('繧ｹ繝医Ξ繝ｼ繧ｸ繧ｨ繝ｩ繝ｼ:', storageError);
      // 莉｣譖ｿ謇区ｮｵ: 繧｢繝励Μ繧ｱ繝ｼ繧ｷ繝ｧ繝ｳ螟画焚縺九ｉ繧ｹ繝医Ξ繝ｼ繧ｸ繧貞叙蠕・
      const appStorage: any = req.app.locals.storage;
      if (appStorage) {
        // 繝｡繝・そ繝ｼ繧ｸ繧剃ｽ懈・
        const message: any = await appStorage.createMessage({
          chatId: Number(chatId),
          content,
          senderId: senderId,
          isUserMessage: isUserMessage,
          timestamp: new Date(),
        });
        console.console.log(
          '莉｣譖ｿ繧ｹ繝医Ξ繝ｼ繧ｸ縺ｧ繧ｷ繧ｹ繝・Β繝｡繝・そ繝ｼ繧ｸ繧剃ｽ懈・縺励∪縺励◆:',
          message.id
        );
        return res.json({
          success: true,
          message,
        });
      } else {
        throw new Error('譛牙柑縺ｪ繧ｹ繝医Ξ繝ｼ繧ｸ縺瑚ｦ九▽縺九ｊ縺ｾ縺帙ｓ');
      }
    }
  } catch (error) {
    console.error('繧ｷ繧ｹ繝・Β繝｡繝・そ繝ｼ繧ｸ騾∽ｿ｡繧ｨ繝ｩ繝ｼ:', error);
    return res.status(500).json({
      success: false,
      message: '繝｡繝・そ繝ｼ繧ｸ縺ｮ騾∽ｿ｡荳ｭ縺ｫ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆',
      error: error instanceof Error ? error.message : '荳肴・縺ｪ繧ｨ繝ｩ繝ｼ',
    });
  }
});
// 蜿､縺・ｮ溯｣・- 迚ｹ螳壹・繧ｬ繧､繝峨ｒ繝√Ε繝・ヨ縺ｫ騾∽ｿ｡縺吶ｋ繧ｨ繝ｳ繝峨・繧､繝ｳ繝・
router.post('/send-to-chat/:guideId/:chatId', async (_req, res) => {
  try {
    const { guideId, chatId } = req.params;
    // 繧ｬ繧､繝峨ョ繝ｼ繧ｿ繧貞叙蠕・
    const files: any = fs
      .readdirSync(kbJsonDir)
      .filter(
        file => file.startsWith(guideId) && file.endsWith('_metadata.json')
      );
    if (files.length === 0) {
      return res.status(404).json({ error: '繧ｬ繧､繝峨′隕九▽縺九ｊ縺ｾ縺帙ｓ' });
    }
    const filePath: any = path.join(kbJsonDir, files[0]);
    const content: any = fs.readFileSync(filePath, 'utf8');
    const guideData: any = JSON.parse(content);
    // JSON繝・・繧ｿ縺ｮ蠖｢蠑上↓蠢懊§縺ｦ繝｡繝・そ繝ｼ繧ｸ蜀・ｮｹ繧剃ｽ懈・
    let messageContent = '';
    // PowerPoint逕ｱ譚･縺ｮ蠖｢蠑上・蝣ｴ蜷・
    if (guideData.metadata && guideData.slides) {
      messageContent = `蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨・{guideData.metadata.繧ｿ繧､繝医Ν}縲阪′蜈ｱ譛峨＆繧後∪縺励◆縲・n\n${guideData.metadata.隱ｬ譏枝`;
    }
    // JSON逕ｱ譚･縺ｮ蠢懈･蜃ｦ鄂ｮ繝輔Ο繝ｼ蠖｢蠑上・蝣ｴ蜷・
    else if (guideData.title && guideData.description) {
      messageContent = `蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨・{guideData.title}縲阪′蜈ｱ譛峨＆繧後∪縺励◆縲・n\n${guideData.description}`;
    }
    // 縺昴・莉悶・蠖｢蠑上・蝣ｴ蜷・
    else {
      messageContent = `蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨・{path.basename(filePath, '_metadata.json')}縲阪′蜈ｱ譛峨＆繧後∪縺励◆縲Ａ;
    }
    // 繝√Ε繝・ヨ縺ｫ繝｡繝・そ繝ｼ繧ｸ繧帝∽ｿ｡縺吶ｋAPI繧貞他縺ｳ蜃ｺ縺・
    const response: any = await fetch(
      `http://localhost:${process.env.PORT || 3000}/api/chats/${chatId}/messages/system`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: messageContent,
          isUserMessage: false,
        }),
      }
    );
    if (!response.ok) {
      throw new Error('繝√Ε繝・ヨ縺ｸ縺ｮ繝｡繝・そ繝ｼ繧ｸ騾∽ｿ｡縺ｫ螟ｱ謨励＠縺ｾ縺励◆');
    }
    const result: any = await response.json();
    res.json({
      success: true,
      message: '繧ｬ繧､繝峨′繝√Ε繝・ヨ縺ｫ騾∽ｿ｡縺輔ｌ縺ｾ縺励◆',
      messageId: result.id,
    });
  } catch (error) {
    console.error('繧ｬ繧､繝蛾∽ｿ｡繧ｨ繝ｩ繝ｼ:', error);
    res
      .status(500)
      .json({ error: '蠢懈･蜃ｦ鄂ｮ繧ｬ繧､繝峨・繝√Ε繝・ヨ縺ｸ縺ｮ騾∽ｿ｡縺ｫ螟ｱ謨励＠縺ｾ縺励◆' });
  }
});

// 繝√Ε繝・ヨ蜀・ｮｹ繧偵Ο繝ｼ繧ｫ繝ｫJSON繝輔ぃ繧､繝ｫ縺ｫ菫晏ｭ倥☆繧九お繝ｳ繝峨・繧､繝ｳ繝・
router.post('/save-chat-local', async (_req, res) => {
  try {
    const { title, messages, metadata = {} } = req.body;

    if (!title || !messages || !Array.isArray(messages)) {
      return res.status(400).json({
        success: false,
        message: '繧ｿ繧､繝医Ν縺ｨ繝｡繝・そ繝ｼ繧ｸ驟榊・縺悟ｿ・ｦ√〒縺・,
      });
    }

    // 繧ｨ繧ｯ繧ｹ繝昴・繝医ョ繧｣繝ｬ繧ｯ繝医Μ縺ｮ繝代せ繧定ｨｭ螳・
    const exportsDir = path.join(knowledgeBaseDir, 'exports');
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    // 繝輔ぃ繧､繝ｫ蜷阪ｒ繧ｿ繧､繝医Ν縺九ｉ逕滓・・亥ｮ牙・縺ｪ譁・ｭ怜・縺ｫ螟画鋤・・
    const safeTitle = title
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50);
    const timestamp = Date.now();
    const fileName = `chat_${safeTitle}_${timestamp}.json`;
    const filePath = path.join(exportsDir, fileName);

    // 逕ｻ蜒丞・逅・ｼ喘ase64逕ｻ蜒上ｒ謚ｽ蜃ｺ縺励※菫晏ｭ・
    const processedMessages = [];

    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      const processedMessage = { ...message };

      // 繝・く繧ｹ繝亥・螳ｹ縺九ｉbase64逕ｻ蜒上ｒ讀懷・
      if (message.content && typeof message.content === 'string') {
        const base64ImageRegex = /data:image\/([a-zA-Z]*);base64,([^"]*)/g;
        let match;
        const imageData = [];

        while ((match = base64ImageRegex.exec(message.content)) !== null) {
          const [fullMatch, imageType, base64Data] = match;

          // 逕ｻ蜒上ヵ繧｡繧､繝ｫ蜷阪ｒ逕滓・
          const imageFileName = `chat_${safeTitle}_${timestamp}_img_${i}_${imageData.length}.${imageType}`;
          const imageFilePath = path.join(exportsDir, imageFileName);

          try {
            // base64繝・・繧ｿ繧偵ヵ繧｡繧､繝ｫ縺ｫ菫晏ｭ・
            const imageBuffer = Buffer.from(base64Data, 'base64');
            fs.writeFileSync(imageFilePath, imageBuffer);

            imageData.push({
              fileName: imageFileName,
              filePath: imageFilePath,
              type: imageType,
              size: imageBuffer.length,
            });

            console.console.log(`逕ｻ蜒丈ｿ晏ｭ伜ｮ御ｺ・ ${imageFileName}`);
          } catch (imageError) {
            console.error('逕ｻ蜒丈ｿ晏ｭ倥お繝ｩ繝ｼ:', imageError);
          }
        }

        // 逕ｻ蜒乗ュ蝣ｱ繧偵Γ繝・そ繝ｼ繧ｸ縺ｫ霑ｽ蜉
        if (imageData.length > 0) {
          processedMessage.images = imageData;
        }
      }

      // media繝励Ο繝代ユ繧｣縺ｫ繧ら判蜒上′縺ゅｋ蝣ｴ蜷医・蜃ｦ逅・
      if (message.media && Array.isArray(message.media)) {
        const processedMedia = [];

        for (let j = 0; j < message.media.length; j++) {
          const mediaItem = message.media[j];

          if (
            mediaItem.type === 'image' &&
            mediaItem.url &&
            mediaItem.url.startsWith('data:image/')
          ) {
            const base64Match = mediaItem.url.match(
              /data:image\/([a-zA-Z]*);base64,(.+)/
            );

            if (base64Match) {
              const [, imageType, base64Data] = base64Match;
              const imageFileName = `chat_${safeTitle}_${timestamp}_media_${i}_${j}.${imageType}`;
              const imageFilePath = path.join(exportsDir, imageFileName);

              try {
                const imageBuffer = Buffer.from(base64Data, 'base64');
                fs.writeFileSync(imageFilePath, imageBuffer);

                processedMedia.push({
                  ...mediaItem,
                  fileName: imageFileName,
                  filePath: imageFilePath,
                  size: imageBuffer.length,
                });

                console.console.log(`繝｡繝・ぅ繧｢逕ｻ蜒丈ｿ晏ｭ伜ｮ御ｺ・ ${imageFileName}`);
              } catch (imageError) {
                console.error('繝｡繝・ぅ繧｢逕ｻ蜒丈ｿ晏ｭ倥お繝ｩ繝ｼ:', imageError);
                processedMedia.push(mediaItem); // 繧ｨ繝ｩ繝ｼ縺ｮ蝣ｴ蜷医・蜈・・繝・・繧ｿ繧剃ｿ晄戟
              }
            } else {
              processedMedia.push(mediaItem);
            }
          } else {
            processedMedia.push(mediaItem);
          }
        }

        if (processedMedia.length > 0) {
          processedMessage.media = processedMedia;
        }
      }

      processedMessages.push(processedMessage);
    }

    // 繝√Ε繝・ヨ繝・・繧ｿ繧谷SON繝輔ぃ繧､繝ｫ縺ｨ縺励※菫晏ｭ・
    const chatData = {
      title,
      metadata: {
        ...metadata,
        savedAt: new Date().toISOString(),
        fileName,
        totalMessages: processedMessages.length,
        imageCount: processedMessages.reduce((count, msg) => {
          return (
            count +
            (msg.images ? msg.images.length : 0) +
            (msg.media ? msg.media.length : 0)
          );
        }, 0),
      },
      messages: processedMessages,
    };

    fs.writeFileSync(filePath, JSON.stringify(chatData, null, 2), 'utf8');

    console.console.log(`繝√Ε繝・ヨ菫晏ｭ伜ｮ御ｺ・ ${filePath}`);
    console.console.log(`菫晏ｭ倥＆繧後◆繝｡繝・そ繝ｼ繧ｸ謨ｰ: ${processedMessages.length}`);
    console.console.log(`菫晏ｭ倥＆繧後◆逕ｻ蜒乗焚: ${chatData.metadata.imageCount}`);

    res.json({
      success: true,
      message: `繝√Ε繝・ヨ蜀・ｮｹ繧偵Ο繝ｼ繧ｫ繝ｫ縺ｫ菫晏ｭ倥＠縺ｾ縺励◆`,
      fileName,
      filePath,
      messageCount: processedMessages.length,
      imageCount: chatData.metadata.imageCount,
    });
  } catch (error) {
    console.error('繝ｭ繝ｼ繧ｫ繝ｫ菫晏ｭ倥お繝ｩ繝ｼ:', error);
    res.status(500).json({
      success: false,
      message: '繝√Ε繝・ヨ蜀・ｮｹ縺ｮ菫晏ｭ倥↓螟ｱ謨励＠縺ｾ縺励◆',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export const emergencyGuideRouter: any = router;
