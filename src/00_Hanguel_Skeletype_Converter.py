#MenuTitle: Hanguel Skeletype Converter
#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
06. 통합 스크립트: 선택한 글리프를 SVG로 변환하여 Import

이 스크립트는 다음 3개 스크립트의 기능을 통합합니다:
1. Save as PNGs.py - 선택한 글리프를 PNG로 내보내기
2. 05_Glyphs3_PNG_to_SVG.py - PNG를 SVG로 변환
3. 04_Glyphs3_SVG_Import_Process.py - SVG를 글리프로 Import

워크플로우:
1. 선택한 글리프를 임시 폴더에 PNG로 내보내기
2. PNG → BMP → SVG 변환 (ImageMagick + Autotrace)
3. SVG를 원본 글리프의 "Converted Skeletype" 레이어에 Import
4. 임시 파일 정리

필수 도구:
- ImageMagick: brew install imagemagick
- Autotrace: brew install autotrace
"""

import os
import subprocess
import tempfile
import shutil
import time
from pathlib import Path

# GlyphsApp imports
from GlyphsApp import *
from GlyphsApp.plugins import GeneralPlugin
import objc
from Foundation import NSMakeRect, NSURL, NSDataWritingAtomic
from AppKit import (
    NSCalibratedRGBColorSpace, NSPNGFileType, NSBitmapImageRep,
    NSGraphicsContext, NSBezierPath, NSAffineTransform, NSColor,
    NSAlert, NSAlertStyleWarning, NSAlertFirstButtonReturn, NSAlertSecondButtonReturn, NSButton,
    NSImageInterpolationHigh
)

# ===== 1단계: PNG 내보내기 함수 (Save as PNGs.py에서 가져옴) =====

def decompose_layer_recursive(layer, master_id):
    """
    레이어의 모든 컴포넌트를 재귀적으로 분해

    중첩된 컴포넌트도 완전히 처리하여 모든 베지어 경로를 추출합니다.
    각 컴포넌트의 변환(transform) 정보를 보존하여 정확한 위치에 경로를 배치합니다.

    Args:
        layer: 분해할 GSLayer 객체
        master_id: 마스터 ID (컴포넌트의 올바른 레이어를 찾기 위해 필요)

    Returns:
        GSLayer: 모든 컴포넌트가 경로로 변환된 새 레이어
    """
    from GlyphsApp import GSLayer

    # 새로운 레이어 생성
    decomposed_layer = GSLayer()
    decomposed_layer.width = layer.width

    # 기존 경로 복사 (컴포넌트가 아닌 직접 그려진 경로들)
    for path in layer.paths:
        decomposed_layer.paths.append(path.copy())

    # 컴포넌트 재귀 처리
    for component in layer.components:
        try:
            # 컴포넌트의 원본 글리프 가져오기
            comp_glyph = component.component
            if not comp_glyph:
                continue

            # 해당 마스터의 레이어 가져오기
            comp_layer = comp_glyph.layers[master_id]
            if not comp_layer:
                continue

            # 컴포넌트도 컴포넌트를 가질 수 있으므로 재귀 호출
            if hasattr(comp_layer, 'components') and len(comp_layer.components) > 0:
                comp_layer = decompose_layer_recursive(comp_layer, master_id)

            # 변환 정보 적용하여 경로 추가
            transform = component.transform

            for path in comp_layer.paths:
                try:
                    path_copy = path.copy()
                    # transform 적용 (위치, 크기, 회전)
                    if transform and hasattr(path_copy, 'applyTransform'):
                        path_copy.applyTransform(transform)
                    decomposed_layer.paths.append(path_copy)
                except Exception as e:
                    print(f"    ⚠️  경로 변환 중 오류 (무시): {str(e)}")
                    continue

        except Exception as e:
            print(f"    ⚠️  컴포넌트 처리 중 오류 (무시): {str(e)}")
            continue

    return decomposed_layer


def saveLayerAsPNG(thisLayer, baseurl, imagemagick_cmd=None):
    """Save a glyph layer as PNG file."""
    try:
        thisGlyph = thisLayer.parent
        glyphName = thisGlyph.name if thisGlyph else "unknown"
        
        # Get dimensions from master
        thisMaster = thisLayer.associatedFontMaster()
        if not thisMaster:
            print(f"    ❌ Error: No master found for glyph '{glyphName}'")
            return None
        
        # 컴포넌트가 있으면 재귀적으로 완전히 분해
        workingLayer = thisLayer
        tempLayerCreated = False

        if hasattr(thisLayer, 'components') and len(thisLayer.components) > 0:
            print(f"    🔧 컴포넌트 {len(thisLayer.components)}개 감지")
            print(f"    📊 분해 전: 경로 {len(thisLayer.paths)}개, 컴포넌트 {len(thisLayer.components)}개")

            try:
                # 재귀적 분해 수행
                workingLayer = decompose_layer_recursive(thisLayer, thisMaster.id)
                tempLayerCreated = True

                print(f"    ✅ 분해 완료: 경로 {len(workingLayer.paths)}개")

                # 분해 검증: 베지어 경로가 실제로 생성되었는지 확인
                bezier_test = workingLayer.completeBezierPath
                if not bezier_test or bezier_test.isEmpty():
                    print(f"    ⚠️  분해 후에도 베지어 경로가 비어있음!")
                    print(f"    💡 원본 레이어 사용으로 폴백")
                    workingLayer = thisLayer
                    tempLayerCreated = False
                else:
                    print(f"    ✅ 베지어 경로 검증 성공")

            except Exception as e:
                print(f"    ❌ 컴포넌트 분해 실패: {str(e)}")
                import traceback
                traceback.print_exc()
                workingLayer = thisLayer
                tempLayerCreated = False
        
        glyphWidth = max(workingLayer.width, 100)  # Minimum width 100
        glyphHeight = thisMaster.ascender - thisMaster.descender
        if glyphHeight <= 0:
            glyphHeight = 1000
        
        # Create bitmap
        rectWidth = int(glyphWidth)
        rectHeight = int(glyphHeight)
        
        bitmap = NSBitmapImageRep.alloc().initWithBitmapDataPlanes_pixelsWide_pixelsHigh_bitsPerSample_samplesPerPixel_hasAlpha_isPlanar_colorSpaceName_bitmapFormat_bytesPerRow_bitsPerPixel_(
            None, rectWidth, rectHeight, 8, 4, True, False,
            NSCalibratedRGBColorSpace, 0, int(4 * rectWidth), 32
        )
        
        # Setup graphics context
        originalContext = NSGraphicsContext.currentContext()
        bitmapContext = NSGraphicsContext.graphicsContextWithBitmapImageRep_(bitmap)
        if not bitmapContext:
            print(f"Error: Failed to create graphics context for '{glyphName}'")
            return None
        
        NSGraphicsContext.setCurrentContext_(bitmapContext)
        NSGraphicsContext.saveGraphicsState()

        # 안티앨리어싱 강제 활성화 (autotrace 호환성)
        bitmapContext.setShouldAntialias_(True)
        bitmapContext.setImageInterpolation_(NSImageInterpolationHigh)

        # Set clipping and fill color
        offscreenRect = NSMakeRect(0.0, 0.0, glyphWidth, glyphHeight)
        NSBezierPath.bezierPathWithRect_(offscreenRect).addClip()
        NSColor.blackColor().set()
        
        # Fill background with white first
        NSColor.whiteColor().setFill()
        NSBezierPath.bezierPathWithRect_(offscreenRect).fill()
        NSColor.blackColor().setFill()
        
        # Transform and draw glyph
        baselineShift = -thisMaster.descender
        shiftTransform = NSAffineTransform.transform()
        shiftTransform.translateXBy_yBy_(0.0, baselineShift)
        
        # 작업 레이어에서 베지어 경로 가져오기
        bezierPath = workingLayer.completeBezierPath

        # 상세 검증 및 디버깅 정보
        if not bezierPath or bezierPath.isEmpty():
            print(f"    ❌ 베지어 경로가 비어있습니다!")
            print(f"    🔍 디버깅 정보:")
            print(f"       - 경로 수: {len(workingLayer.paths)}")
            print(f"       - 컴포넌트 수: {len(workingLayer.components)}")
            print(f"       - 레이어 너비: {workingLayer.width}")
            print(f"       - 마스터: {thisMaster.name}")

            # 경로는 있는데 베지어가 비어있는 경우 (이상한 케이스)
            if len(workingLayer.paths) > 0:
                print(f"    ⚠️  경로는 존재하지만 completeBezierPath가 비어있음")
                print(f"    💡 이는 Glyphs 내부 버그일 수 있습니다")
                # 강제로 경로 재계산 시도
                try:
                    workingLayer.updateMetrics()
                    bezierPath = workingLayer.completeBezierPath
                    if bezierPath and not bezierPath.isEmpty():
                        print(f"    ✅ updateMetrics() 후 베지어 경로 복구됨")
                except:
                    pass

            # 여전히 비어있으면 실패
            if not bezierPath or bezierPath.isEmpty():
                # space나 빈 글리프는 조용히 건너뛰기
                if glyphName and glyphName.lower() in ['space', '.notdef', 'null', 'cr']:
                    return None

                # 다른 글리프는 경고 표시
                print(f"    ⚠️  Warning: No bezier path found for glyph '{glyphName}'")
                return None
        
        # 경로 복사 및 변환
        bezierPath = bezierPath.copy()
        bezierPath.transformUsingAffineTransform_(shiftTransform)
        bezierPath.fill()
        
        # Restore context
        NSGraphicsContext.restoreGraphicsState()
        NSGraphicsContext.setCurrentContext_(originalContext)
        
        # Generate filename
        pngName = "_%s" % glyphName if thisGlyph.subCategory == "Uppercase" else glyphName
        fullPath = os.path.join(baseurl, "%s.png" % pngName)
        
        # Save PNG
        pngData = bitmap.representationUsingType_properties_(NSPNGFileType, None)
        if not pngData:
            print(f"Error: Failed to generate PNG data for '{glyphName}'")
            return None
        
        url = NSURL.fileURLWithPath_(fullPath)
        success = pngData.writeToURL_options_error_(url, NSDataWritingAtomic, None)
        
        if not success or not os.path.exists(fullPath):
            print(f"    ❌ Error: Failed to write PNG file for '{glyphName}'")
            return None
        
        # PNG 파일 크기 확인 (빈 PNG 감지)
        file_size = os.path.getsize(fullPath)
        print(f"    📊 PNG 파일 크기: {file_size} bytes")

        if file_size < 200:  # 200 bytes 미만이면 빈 이미지
            print(f"    ❌ PNG 파일이 너무 작습니다 (빈 이미지)")
            print(f"    🔍 원인 분석:")
            print(f"       1. 컴포넌트 분해 실패 가능성")
            print(f"       2. 글리프 크기가 0에 가까움")
            print(f"       3. 렌더링 영역 계산 오류")
            print(f"    💾 PNG 파일 보존: {fullPath}")
            # 파일 삭제하지 않고 보존 (디버깅용)
            # os.remove(fullPath)
            return None

        print(f"    ✅ PNG 생성 성공 ({file_size} bytes)")

        # 이진화된 이미지 감지 및 블러 처리 (autotrace 호환성)
        if imagemagick_cmd:
            try:
                result = subprocess.run(
                    [imagemagick_cmd, fullPath, '-format', '%[colors]', 'info:'],
                    capture_output=True, text=True, timeout=5
                )
                if result.returncode == 0:
                    color_count = int(result.stdout.strip())
                    if color_count <= 2:
                        print(f"    ⚠️  이진화된 이미지 감지 ({color_count} colors)")
                        print(f"    🔧 안티앨리어싱 적용 중...")
                        # 약간의 블러로 안티앨리어싱 효과 추가
                        subprocess.run(
                            [imagemagick_cmd, fullPath, '-blur', '0x0.3', fullPath],
                            capture_output=True, timeout=10
                        )
                        print(f"    ✅ 안티앨리어싱 적용 완료")
            except Exception as e:
                # 블러 처리 실패해도 계속 진행
                print(f"    ⚠️  블러 처리 실패 (계속 진행): {str(e)}")

        return fullPath
        
    except Exception as e:
        glyphName = thisLayer.parent.name if thisLayer.parent else "unknown"
        print(f"Error saving '{glyphName}': {str(e)}")
        return None


# ===== 2단계: PNG → SVG 변환 함수 (05_Glyphs3_PNG_to_SVG.py에서 가져옴) =====

def check_imagemagick():
    """ImageMagick이 설치되어 있는지 확인"""
    possible_paths = [
        '/opt/homebrew/bin/magick',
        '/opt/homebrew/bin/convert',
        '/usr/local/bin/magick',
        '/usr/local/bin/convert',
        'magick',
        'convert'
    ]
    
    for cmd_path in possible_paths:
        try:
            result = subprocess.run(
                [cmd_path, '-version'] if 'magick' in cmd_path else [cmd_path, '-version'],
                capture_output=True,
                text=True
            )
            if result.returncode == 0:
                return cmd_path if '/' in cmd_path else ('magick' if 'magick' in cmd_path else 'convert')
        except FileNotFoundError:
            continue
    
    return None


def check_autotrace():
    """Autotrace가 설치되어 있는지 확인"""
    possible_paths = [
        '/opt/homebrew/bin/autotrace',
        '/usr/local/bin/autotrace',
        'autotrace'
    ]
    
    for cmd_path in possible_paths:
        try:
            result = subprocess.run([cmd_path, '--version'],
                                  capture_output=True,
                                  text=True)
            if result.returncode == 0:
                return cmd_path if '/' in cmd_path else 'autotrace'
        except FileNotFoundError:
            continue
    
    return None


def convert_png_to_bmp(png_path, bmp_path, imagemagick_cmd):
    """PNG를 BMP로 변환"""
    if 'magick' in imagemagick_cmd:
        command = [
            imagemagick_cmd,
            png_path,
            '-bordercolor', 'white',
            '-border', '1',
            bmp_path
        ]
    else:
        command = [
            imagemagick_cmd,
            '-bordercolor', 'white',
            '-border', '1',
            png_path,
            bmp_path
        ]
    
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            print(f"    ❌ ImageMagick 오류: {result.stderr}")
            return False
        if not Path(bmp_path).exists():
            print(f"    ❌ BMP 파일이 생성되지 않았습니다: {bmp_path}")
            return False
        return True
    except Exception as e:
        print(f"    ❌ BMP 변환 오류: {str(e)}")
        return False


def convert_png_to_svg(png_path, svg_path, autotrace_cmd):
    """PNG를 SVG로 직접 변환 (BMP 단계 제거)"""
    command = [
        autotrace_cmd,
        '-centerline',
        '-output-file', svg_path,
        '-background-color=FFFFFF',
        '-color-count', '2',
        png_path
    ]
    
    try:
        result = subprocess.run(command, capture_output=True, text=True, timeout=30)
        if result.returncode != 0:
            print(f"    ❌ Autotrace 오류: {result.stderr}")
            return False
        if not Path(svg_path).exists():
            print(f"    ❌ SVG 파일이 생성되지 않았습니다: {svg_path}")
            return False
        
        # SVG 파일 내용 검증: 실제 경로가 있는지 확인
        try:
            with open(svg_path, 'r', encoding='utf-8') as f:
                svg_content = f.read()
                # SVG에 path, polygon, polyline, circle, ellipse, rect 등의 요소가 있는지 확인
                has_paths = any(tag in svg_content for tag in ['<path', '<polygon', '<polyline', '<circle', '<ellipse', '<rect'])
                if not has_paths:
                    print(f"    ⚠️  SVG 파일이 생성되었지만 경로가 없습니다 (빈 SVG)")
                    print(f"    💡 원인: 글리프가 너무 작거나, 중심선을 추출할 수 없습니다")
                    return False
        except Exception as e:
            print(f"    ⚠️  SVG 파일 내용 확인 실패: {str(e)}")
            # 파일은 존재하므로 일단 True 반환 (import 단계에서 실패할 수 있음)
        
        return True
    except Exception as e:
        print(f"    ❌ SVG 변환 오류: {str(e)}")
        return False


# ===== 3단계: SVG Import 함수 (04_Glyphs3_SVG_Import_Process.py에서 가져옴) =====

# GSSVGtoPath 클래스 찾기
GSSVGtoPath = None

try:
    import objc
    possible_class_names = ['GSSVGtoPath', 'GSOutlineImporter', 'GSSVGImporter', 'GSOutlineImporterSVG']
    for class_name in possible_class_names:
        try:
            cls = objc.lookUpClass(class_name)
            if cls:
                GSSVGtoPath = cls
                break
        except:
            continue
except:
    pass

if GSSVGtoPath is None:
    try:
        from GlyphsApp import GSSVGtoPath
    except ImportError:
        pass


def import_svg_to_layer(svg_path, layer):
    """SVG 파일을 레이어로 import"""
    global GSSVGtoPath
    
    try:
        svg_path_str = str(svg_path)
        if not os.path.exists(svg_path_str):
            return False, f"File does not exist: {svg_path_str}"
        
        fileURL = NSURL.fileURLWithPath_(svg_path_str)
        if not fileURL:
            return False, f"Failed to create NSURL from path: {svg_path_str}"
        
        if GSSVGtoPath is None:
            return False, "GSSVGtoPath class not available"
        
        OutlineImporter = GSSVGtoPath.alloc().init()
        if not OutlineImporter:
            return False, "Failed to create GSSVGtoPath importer"
        
        paths_before = len(layer.paths) if hasattr(layer, 'paths') else 0
        
        # SVG import 실행
        success = False
        try:
            success = OutlineImporter.readFile_toLayer_bounds_error_(fileURL, layer, None, None)
        except:
            try:
                success = OutlineImporter.readFile_toLayer_(fileURL, layer)
            except:
                pass
        
        paths_after = len(layer.paths) if hasattr(layer, 'paths') else 0
        
        if success and paths_after > paths_before:
            try:
                layer.updateMetrics()
            except:
                pass
            return True, None
        else:
            # 더 자세한 실패 원인 파악
            error_msg = f"Import failed or no paths added"
            if not success:
                error_msg += " (import 메서드 실패)"
            elif paths_after == paths_before:
                error_msg += f" (경로 수 변화 없음: {paths_before} → {paths_after})"
            
            # SVG 파일 내용 확인 (디버깅용)
            try:
                with open(svg_path_str, 'r', encoding='utf-8') as f:
                    svg_content = f.read()
                    file_size = len(svg_content)
                    has_paths = any(tag in svg_content for tag in ['<path', '<polygon', '<polyline'])
                    if file_size < 500:
                        error_msg += f" (SVG 파일이 너무 작음: {file_size} bytes)"
                    elif not has_paths:
                        error_msg += " (SVG에 경로 요소 없음)"
            except:
                pass
            
            return False, error_msg
            
    except Exception as e:
        import traceback
        traceback.print_exc()
        return False, f"Exception: {str(e)}"


def align_svg_to_original_layer(svg_layer, original_layer):
    """SVG 레이어를 기존 레이어의 면 중앙에 위치시키고 정렬"""
    try:
        if not original_layer:
            return False, "Original layer not provided"
        
        original_bounds = original_layer.bounds
        if not original_bounds:
            return False, "Original layer has no bounds"
        
        original_x = original_bounds.origin.x
        original_y = original_bounds.origin.y
        original_width = original_bounds.size.width
        original_height = original_bounds.size.height
        
        original_center_x = original_x + original_width / 2.0
        original_center_y = original_y + original_height / 2.0
        
        svg_bounds = svg_layer.bounds
        if not svg_bounds:
            return False, "SVG layer has no bounds"
        
        svg_x = svg_bounds.origin.x
        svg_y = svg_bounds.origin.y
        svg_width = svg_bounds.size.width
        svg_height = svg_bounds.size.height
        
        svg_center_x = svg_x + svg_width / 2.0
        svg_center_y = svg_y + svg_height / 2.0
        
        # 스케일 계산 (97% 목표 크기)
        scale_x = (original_width * 0.97) / svg_width if svg_width > 0 else 1.0
        scale_y = (original_height * 0.97) / svg_height if svg_height > 0 else 1.0
        scale = min(scale_x, scale_y)
        
        # 1단계: 스케일 적용
        min_x = float('inf')
        max_x = float('-inf')
        min_y = float('inf')
        max_y = float('-inf')
        
        for path in svg_layer.paths:
            for node in path.nodes:
                try:
                    relative_x = node.x - svg_center_x
                    relative_y = node.y - svg_center_y
                    scaled_x = relative_x * scale
                    scaled_y = relative_y * scale
                    new_x = svg_center_x + scaled_x
                    new_y = svg_center_y + scaled_y
                    node.x = new_x
                    node.y = new_y
                    min_x = min(min_x, new_x)
                    max_x = max(max_x, new_x)
                    min_y = min(min_y, new_y)
                    max_y = max(max_y, new_y)
                except:
                    continue
        
        try:
            svg_layer.updateMetrics()
        except:
            pass
        
        # 스케일 후 중심점 계산
        if min_x != float('inf'):
            scaled_center_x = (min_x + max_x) / 2.0
            scaled_center_y = (min_y + max_y) / 2.0
        else:
            scaled_bounds = svg_layer.bounds
            if scaled_bounds:
                scaled_center_x = scaled_bounds.origin.x + scaled_bounds.size.width / 2.0
                scaled_center_y = scaled_bounds.origin.y + scaled_bounds.size.height / 2.0
            else:
                return False, "Could not calculate scaled center"
        
        # 2단계: 중앙 정렬
        offset_x = original_center_x - scaled_center_x
        offset_y = original_center_y - scaled_center_y
        
        for path in svg_layer.paths:
            for node in path.nodes:
                try:
                    node.x += offset_x
                    node.y += offset_y
                except:
                    continue
        
        try:
            svg_layer.updateMetrics()
        except:
            pass
        
        # LSB 조정 (SVG 너비의 3%)
        final_bounds = svg_layer.bounds
        if final_bounds:
            svg_final_width = final_bounds.size.width
            lsb_adjustment = -(svg_final_width * 0.03)
            current_lsb = svg_layer.LSB
            new_lsb = current_lsb + lsb_adjustment
            
            try:
                svg_layer.LSB = new_lsb
                svg_layer.updateMetrics()
            except:
                pass
        
        return True, None
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return False, f"Exception: {str(e)}"


# ===== Glyphs 3 GeneralPlugin 클래스 =====

class HanguelSkeletypeConverter(GeneralPlugin):
    """
    Glyphs 3 플러그인: 한글 글리프를 스켈레톤 타입으로 변환
    """
    
    @objc.python_method
    def settings(self):
        """플러그인 설정"""
        self.name = "Hanguel Skeletype Converter"
    
    @objc.python_method  
    def start(self):
        """플러그인 실행 - Edit 메뉴에서 선택 시 호출됨"""
        Glyphs.clearLog()
        print("=" * 60)
        print("Hanguel Skeletype Converter v1.5")
        print("=" * 60)
        
        # 현재 폰트 확인
        thisFont = Glyphs.font
        if not thisFont:
            print("❌ 폰트가 열려있지 않습니다.")
            return
        
        # 폰트 정보 출력
        fontName = thisFont.familyName if thisFont.familyName else "Unknown Font"
        print(f"📖 폰트: {fontName}")
        
        # 마스터 정보 출력
        master = thisFont.masters[0] if thisFont.masters else None
        if master:
            masterName = master.name if master.name else "Master"
            print(f"🎨 마스터: {masterName}")
        print()
        
        selectedLayers = thisFont.selectedLayers
        
        if not selectedLayers or len(selectedLayers) == 0:
            print("❌ 선택한 글리프가 없습니다.")
            return
        
        print(f"📝 선택한 글리프: {len(selectedLayers)}개\n")
        
        # 필수 도구 확인
        imagemagick_cmd = check_imagemagick()
        autotrace_cmd = check_autotrace()
        
        if not imagemagick_cmd:
            print("❌ ImageMagick이 설치되어 있지 않습니다.")
            print("   설치: brew install imagemagick")
            return
        if not autotrace_cmd:
            print("❌ Autotrace가 설치되어 있지 않습니다.")
            print("   설치: brew install autotrace")
            return
        
        print(f"✅ ImageMagick: {imagemagick_cmd}")
        print(f"✅ Autotrace: {autotrace_cmd}")
        print()
        
        # 임시 폴더 생성
        temp_dir = tempfile.mkdtemp(prefix="glyphs_svg_")
        print(f"📁 임시 폴더: {temp_dir}\n")
        
        master = thisFont.masters[0]
        success_count = 0
        failed_count = 0
        glyph_times = []  # 각 글리프 처리 시간 저장
        total_start_time = time.time()  # 전체 작업 시작 시간
        
        # 첫 번째 다이얼로그: 전체 선택한 글리프에 대한 확인 (한 번만 표시)
        if len(selectedLayers) > 0:
            firstGlyph = selectedLayers[0].parent
            firstGlyphName = firstGlyph.name if firstGlyph else "unknown"
            
            # 메시지 구성
            if len(selectedLayers) == 1:
                messageText = f"'{firstGlyphName}' 글리프의 중심선을 추출하시겠습니까?"
                informativeText = f"이 글리프에 'Converted Skeletype' 레이어가 생성됩니다."
            else:
                remainingCount = len(selectedLayers) - 1
                messageText = f"'{firstGlyphName}' 글리프 외 {remainingCount}개 글리프의 중심선을 추출하시겠습니까?"
                informativeText = f"총 {len(selectedLayers)}개 글리프에 'Converted Skeletype' 레이어가 생성됩니다."
            
            alert1 = NSAlert.alloc().init()
            alert1.setAlertStyle_(NSAlertStyleWarning)
            alert1.setMessageText_(messageText)
            alert1.setInformativeText_(informativeText)
            alert1.addButtonWithTitle_("추출")
            alert1.addButtonWithTitle_("취소")
            
            response1 = alert1.runModal()
            
            if response1 == NSAlertSecondButtonReturn:  # "취소" 버튼
                print("❌ 사용자가 취소했습니다.")
                # 임시 폴더 정리
                try:
                    shutil.rmtree(temp_dir)
                except:
                    pass
                return
        
        # 각 선택한 글리프 처리
        for idx, thisLayer in enumerate(selectedLayers, 1):
            glyph_start_time = time.time()  # 글리프 처리 시작 시간
            try:
                thisGlyph = thisLayer.parent
                glyphName = thisGlyph.name if thisGlyph else "unknown"

                print(f"\n{'='*60}")
                print(f"[{idx}/{len(selectedLayers)}] 처리 중: {glyphName}")
                print(f"🔍 글리프 '{glyphName}' 상세 정보:")
                print(f"   - 서체: {thisFont.familyName if thisFont.familyName else 'Unknown'}")
                print(f"   - 마스터: {master.name if master.name else 'Unknown'}")
                print(f"   - 레이어 수: {len(thisGlyph.layers)}")
                print(f"   - 경로 수: {len(thisLayer.paths)}")
                print(f"   - 컴포넌트 수: {len(thisLayer.components)}")
                if len(thisLayer.components) > 0:
                    print(f"   - 컴포넌트 목록:")
                    for comp in thisLayer.components:
                        comp_name = comp.componentName if hasattr(comp, 'componentName') else str(comp.component.name if comp.component else 'unknown')
                        print(f"      * {comp_name}")
                print(f"{'='*60}\n")

                # Converted Skeletype 레이어가 이미 존재하는지 확인
                svg_layer_name = "Converted Skeletype"
                existing_svg_layer = None
                for l in thisGlyph.layers:
                    if hasattr(l, 'name') and l.name == svg_layer_name:
                        existing_svg_layer = l
                        break
                
                # 이미 레이어가 있으면 자동으로 건너뛰기
                if existing_svg_layer:
                    print(f"  ⏭️  이미 'Converted Skeletype' 레이어가 존재합니다. 건너뜁니다.")
                    print()
                    continue
                
                # 원본 레이어 정보 저장
                original_layer = None
                for l in thisGlyph.layers:
                    if l.associatedMasterId == master.id:
                        original_layer = l
                        break
                
                if not original_layer:
                    original_layer = thisLayer
                
                # 1단계: PNG 내보내기
                print(f"  1️⃣ PNG 내보내기...")
                png_path = saveLayerAsPNG(thisLayer, temp_dir, imagemagick_cmd)
                if not png_path:
                    print(f"  ⏭️  빈 글리프이거나 경로가 없습니다. 건너뜁니다.")
                    print()
                    failed_count += 1
                    continue
                
                png_name = Path(png_path).stem

                # 2단계: PNG → SVG 직접 변환
                print(f"  2️⃣ SVG 변환...")
                svg_path = os.path.join(temp_dir, f"{png_name}.svg")

                if not convert_png_to_svg(png_path, svg_path, autotrace_cmd):
                    print(f"  ❌ SVG 변환 실패")
                    failed_count += 1
                    continue
                
                # 3단계: SVG Import
                print(f"  3️⃣ SVG Import...")
                
                # SVG Import 레이어 생성 또는 가져오기
                svg_layer_name = "Converted Skeletype"
                existing_svg_layer = None
                for l in thisGlyph.layers:
                    if hasattr(l, 'name') and l.name == svg_layer_name:
                        existing_svg_layer = l
                        break
                
                if existing_svg_layer:
                    layer = existing_svg_layer
                    # 기존 경로 제거
                    try:
                        existing_paths = list(layer.paths)
                        for path in reversed(existing_paths):
                            try:
                                layer.removePath_(path)
                            except:
                                try:
                                    layer.paths.remove(path)
                                except:
                                    pass
                    except:
                        pass
                    try:
                        layer.visible = True
                    except:
                        pass
                else:
                    layer = GSLayer()
                    layer.associatedMasterId = master.id
                    try:
                        layer.name = svg_layer_name
                    except:
                        pass
                    thisGlyph.layers.append(layer)
                    try:
                        layer.visible = True
                    except:
                        pass
                
                # SVG import
                success, error = import_svg_to_layer(svg_path, layer)
                if success:
                    # 정렬 및 LSB 조정
                    if original_layer:
                        align_success, align_error = align_svg_to_original_layer(layer, original_layer)
                        if align_success:
                            print(f"  ✅ 정렬 완료")
                        else:
                            print(f"  ⚠️  정렬 실패: {align_error}")
                    
                    # 원본 메트릭 적용
                    if original_layer:
                        try:
                            layer.LSB = original_layer.LSB
                            layer.width = original_layer.width
                            layer.RSB = original_layer.RSB
                            layer.updateMetrics()
                        except:
                            pass
                    
                    glyph_elapsed = time.time() - glyph_start_time
                    glyph_times.append(glyph_elapsed)
                    print(f"  ✅ 완료! ({glyph_elapsed:.2f}초)")
                    success_count += 1
                else:
                    print(f"  ❌ Import 실패: {error}")
                    failed_count += 1
                
                # 임시 파일 정리
                if os.path.exists(png_path):
                    os.remove(png_path)
                if os.path.exists(svg_path):
                    os.remove(svg_path)
                
                print()
                
            except Exception as e:
                print(f"  ❌ 처리 실패: {str(e)}")
                import traceback
                traceback.print_exc()
                failed_count += 1
                print()
        
        # 임시 폴더 정리
        try:
            shutil.rmtree(temp_dir)
        except:
            pass
        
        # 결과 요약
        total_elapsed = time.time() - total_start_time
        print("=" * 60)
        print(f"✅ 완료: 성공 {success_count}개, 실패 {failed_count}개")
        print(f"⏱️  총 소요 시간: {total_elapsed:.2f}초")
        if glyph_times:
            avg_time = sum(glyph_times) / len(glyph_times)
            min_time = min(glyph_times)
            max_time = max(glyph_times)
            print(f"📊 글리프당 평균: {avg_time:.2f}초 (최소: {min_time:.2f}초, 최대: {max_time:.2f}초)")
        print("=" * 60)
        
        if success_count > 0:
            Glyphs.redraw()
            print(f"\n💡 Converted Skeletype 레이어에서 변환된 중심선을 확인할 수 있습니다.")

    def __file__(self):
        """Required for Glyphs to find this plugin"""
        return __file__


