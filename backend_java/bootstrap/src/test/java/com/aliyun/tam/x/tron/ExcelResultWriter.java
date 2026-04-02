package com.aliyun.tam.x.tron;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.common.collect.Maps;
import org.apache.poi.openxml4j.exceptions.InvalidFormatException;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellType;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.xssf.usermodel.XSSFRow;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

public class ExcelResultWriter {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    private final Path path;
    private final String defaultSheetName;

    public ExcelResultWriter(Path path) {
        this(path, null);
    }

    public ExcelResultWriter(Path path, String defaultSheetName) {
        this.path = path;
        this.defaultSheetName = defaultSheetName;
    }

    public void append(Object... objs) throws IOException, InvalidFormatException {
        append(this.defaultSheetName, objs);
    }

    public void append(String sheetName, Object... objs) throws IOException, InvalidFormatException {
        Map<String, Object> data = serializeData(objs);

        XSSFWorkbook workbook;
        if (Files.exists(path)) {
            try (InputStream is = Files.newInputStream(path)) {
                workbook = new XSSFWorkbook(is);
            }
        } else {
            workbook = new XSSFWorkbook();
        }
        try {
            XSSFSheet sheet;
            Map<String, Integer> indices;
            if (sheetName == null) {
                if (workbook.getNumberOfSheets() == 0) {
                    sheet = workbook.createSheet();
                    indices = buildNewIndices(sheet, data);
                } else {
                    sheet = workbook.getSheetAt(0);
                    indices = buildIndicesFromSheet(sheet, data);
                }
            } else {
                sheet = workbook.getSheet(sheetName);
                if (sheet == null) {
                    sheet = workbook.createSheet(sheetName);
                    indices = buildNewIndices(sheet, data);
                } else {
                    indices = buildIndicesFromSheet(sheet, data);
                }
            }

            int lastRowNum = sheet.getLastRowNum();
            XSSFRow row = sheet.createRow(lastRowNum + 1);
            for (String key : data.keySet()) {
                Object value = data.get(key);
                Cell cell = row.createCell(indices.get(key));
                if (value == null) {
                    cell.setCellValue("");
                } else if (value instanceof String || value instanceof Number || value instanceof Boolean) {
                    cell.setCellValue(value.toString());
                } else {
                    cell.setCellValue(OBJECT_MAPPER.writeValueAsString(value));
                }
            }
            try (var out = Files.newOutputStream(path)) {
                workbook.write(out);
            }
        } finally {
            workbook.close();
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> serializeData(Object[] objs) {
        Map<String, Object> data = Maps.newLinkedHashMap();
        for (Object obj : objs) {
            if (obj instanceof Map<?, ?> m) {
                data.putAll((Map<String, Object>) m);
            } else {
                data.putAll(
                        OBJECT_MAPPER.convertValue(obj, new TypeReference<>() {
                        })
                );
            }
        }
        return data;
    }

    private Map<String, Integer> buildIndicesFromSheet(XSSFSheet sheet, Map<String, Object> data) {
        Map<String, Integer> indices = Maps.newHashMap();
        int maxColNum = 0;
        Row firstRow = sheet.getRow(sheet.getFirstRowNum());
        for (int colNum = firstRow.getFirstCellNum(); colNum <= firstRow.getLastCellNum(); colNum++) {
            Cell cell = firstRow.getCell(colNum);
            if (cell != null && cell.getCellType() == CellType.STRING) {
                String columnName = cell.getStringCellValue();
                indices.put(columnName, colNum);
                maxColNum = Math.max(maxColNum, colNum);
            }
        }

        for (String key : data.keySet()) {
            if (!indices.containsKey(key)) {
                indices.put(key, maxColNum + 1);
                maxColNum++;
            }
        }

        return indices;
    }

    private Map<String, Integer> buildNewIndices(XSSFSheet sheet, Map<String, Object> data) {
        Map<String, Integer> indices = Maps.newHashMap();

        int maxColNum = 0;
        Row row = sheet.createRow(0);
        for (String key : data.keySet()) {
            row.createCell(maxColNum).setCellValue(key);
            indices.put(key, maxColNum);
            maxColNum++;
        }
        return indices;
    }


}
