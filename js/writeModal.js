/**
 * ==========================================================================
 * 감자(Gamza) 마켓 - 화면 3: 상품 등록(글쓰기) 모듈 (write-modal.js)
 * ==========================================================================
 */

(function (global) {
  'use strict';

  // 상태 관리
  let elements = null;
  let currentImageUrl = '';
  let submitCallback = null;
  let updateCallback = null;
  let currentEditingProductId = null;
  let isEventsBound = false;
  let isSubmitting = false;

  // 기본 감자 대체 이미지 (사진 미선택 시 사용)
  const DEFAULT_POTATO_IMAGE = 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=600&auto=format&fit=crop&q=80';

  /**
   * DOM 요소 캐싱
   */
  function initElements() {
    if (elements) return elements;

    elements = {
      overlay: document.getElementById('gamzaWriteModal'),
      container: document.querySelector('#gamzaWriteModal .gamza-write-modal-container'),
      closeBtn: document.getElementById('gamzaWriteModalCloseBtn'),
      cancelBtn: document.getElementById('gamzaWriteCancelBtn'),
      submitBtn: document.getElementById('gamzaWriteSubmitBtn'),
      modalTitle: document.getElementById('gamzaWriteModalTitle'),
      form: document.getElementById('gamzaWriteForm'),

      // 이미지 관련
      fileInput: document.getElementById('gamzaProductImageInput'),
      dropzone: document.getElementById('gamzaUploadDropzone'),
      dropzonePrompt: document.getElementById('gamzaDropzonePrompt'),
      previewWrapper: document.getElementById('gamzaImagePreviewWrapper'),
      previewImage: document.getElementById('gamzaImagePreview'),
      removeImageBtn: document.getElementById('gamzaImageRemoveBtn'),
      sampleChips: document.querySelectorAll('.gamza-sample-chip'),

      // 인풋 필드
      titleInput: document.getElementById('gamzaProductTitle'),
      titleCounter: document.getElementById('gamzaTitleCounter'),
      categorySelect: document.getElementById('gamzaProductCategory'),
      priceInput: document.getElementById('gamzaProductPrice'),
      priceFreeCheck: document.getElementById('gamzaPriceFreeCheck'),
      pricePreview: document.getElementById('gamzaPricePreview'),
      priceKorean: document.getElementById('gamzaPriceKorean'),
      locationInput: document.getElementById('gamzaProductLocation'),
      locationChips: document.querySelectorAll('.gamza-location-chip'),
      descTextarea: document.getElementById('gamzaProductDesc'),
      descCounter: document.getElementById('gamzaDescCounter'),

      // 에러 메시지 엘리먼트
      errorImage: document.getElementById('error-image'),
      errorTitle: document.getElementById('error-title'),
      errorCategory: document.getElementById('error-category'),
      errorPrice: document.getElementById('error-price'),
      errorLocation: document.getElementById('error-location'),
      errorDesc: document.getElementById('error-description')
    };

    return elements;
  }

  /**
   * 이벤트 바인딩
   */
  function bindEvents() {
    if (isEventsBound) return;
    const el = initElements();
    if (!el.overlay) return;
    isEventsBound = true;

    // 1. 모달 닫기 버튼 및 취소 버튼
    if (el.closeBtn) {
      el.closeBtn.addEventListener('click', handleModalClose);
    }
    if (el.cancelBtn) {
      el.cancelBtn.addEventListener('click', handleModalClose);
    }

    // 2. 오버레이 바깥 배경 클릭 시 닫기
    el.overlay.addEventListener('click', function (e) {
      if (e.target === el.overlay) {
        handleModalClose();
      }
    });

    // 3. ESC 키 입력 시 닫기
    document.addEventListener('keydown', function (e) {
      if ((e.key === 'Escape' || e.key === 'Esc') && el.overlay.classList.contains('is-active')) {
        handleModalClose();
      }
    });

    // 4. 상품 목록 화면(화면 1)의 글쓰기 버튼 클릭 커스텀 이벤트 감지
    window.addEventListener('gamza:writeClick', function () {
      openWriteModal();
    });

    // 5. 이미지 파일 업로드 (change)
    if (el.fileInput) {
      el.fileInput.addEventListener('change', function (e) {
        const file = e.target.files && e.target.files[0];
        if (file) {
          processImageFile(file);
        }
      });
    }

    // 6. 드래그 앤 드롭 이벤트
    if (el.dropzone) {
      ['dragenter', 'dragover'].forEach(eventName => {
        el.dropzone.addEventListener(eventName, function (e) {
          e.preventDefault();
          e.stopPropagation();
          el.dropzone.classList.add('is-dragover');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        el.dropzone.addEventListener(eventName, function (e) {
          e.preventDefault();
          e.stopPropagation();
          el.dropzone.classList.remove('is-dragover');
        });
      });

      el.dropzone.addEventListener('drop', function (e) {
        const files = e.dataTransfer && e.dataTransfer.files;
        if (files && files.length > 0) {
          const file = files[0];
          if (file.type.startsWith('image/')) {
            processImageFile(file);
          } else {
            alert('이미지 파일(JPG, PNG, WEBP 등)만 등록할 수 있습니다.');
          }
        }
      });
    }

    // 7. 이미지 삭제 버튼
    if (el.removeImageBtn) {
      el.removeImageBtn.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        clearImage();
      });
    }

    // 8. 추천 샘플 이미지 칩 클릭
    if (el.sampleChips) {
      el.sampleChips.forEach(chip => {
        chip.addEventListener('click', function (e) {
          e.preventDefault();
          const imgUrl = this.dataset.img;
          if (imgUrl) {
            setSampleImage(imgUrl, this);
          }
        });
      });
    }

    // 9. 상품명 글자 수 카운터 및 유효성 피드백
    if (el.titleInput) {
      el.titleInput.addEventListener('input', function () {
        if (el.titleCounter) {
          el.titleCounter.textContent = this.value.length;
        }
        if (this.value.trim().length >= 2) {
          clearFieldError(el.titleInput, el.errorTitle);
        }
      });
    }

    // 10. 카테고리 변경 시 에러 클리어
    if (el.categorySelect) {
      el.categorySelect.addEventListener('change', function () {
        if (this.value) {
          clearFieldError(el.categorySelect, el.errorCategory);
        }
      });
    }

    // 11. 가격 입력 포맷팅 & 원 단위 피드백
    if (el.priceInput) {
      el.priceInput.addEventListener('input', function () {
        let rawVal = this.value.replace(/[^0-9]/g, '');
        if (rawVal === '') {
          this.value = '';
          if (el.pricePreview) el.pricePreview.style.display = 'none';
          return;
        }

        const numVal = parseInt(rawVal, 10);
        this.value = numVal.toLocaleString('ko-KR');

        if (el.pricePreview && el.priceKorean) {
          el.pricePreview.style.display = 'block';
          el.priceKorean.textContent = formatKoreanCurrency(numVal);
        }

        clearFieldError(el.priceInput, el.errorPrice);
      });
    }

    // 12. 무료 나눔 체크박스 연동
    if (el.priceFreeCheck) {
      el.priceFreeCheck.addEventListener('change', function () {
        if (this.checked) {
          el.priceInput.value = '0';
          el.priceInput.disabled = true;
          if (el.pricePreview && el.priceKorean) {
            el.pricePreview.style.display = 'block';
            el.priceKorean.textContent = '0원 (무료 나눔 🥔)';
          }
          clearFieldError(el.priceInput, el.errorPrice);
        } else {
          el.priceInput.disabled = false;
          el.priceInput.value = '';
          if (el.pricePreview) el.pricePreview.style.display = 'none';
        }
      });
    }

    // 13. 빠른 동네 추천 칩 클릭
    if (el.locationChips) {
      el.locationChips.forEach(chip => {
        chip.addEventListener('click', function (e) {
          e.preventDefault();
          const loc = this.dataset.loc || this.textContent;
          if (el.locationInput) {
            el.locationInput.value = loc;
            clearFieldError(el.locationInput, el.errorLocation);
          }
        });
      });
    }

    if (el.locationInput) {
      el.locationInput.addEventListener('input', function () {
        if (this.value.trim().length >= 2) {
          clearFieldError(el.locationInput, el.errorLocation);
        }
      });
    }

    // 14. 자세한 설명 글자 수 카운터 및 유효성 피드백
    if (el.descTextarea) {
      el.descTextarea.addEventListener('input', function () {
        if (this.value.length > 500) {
          this.value = this.value.slice(0, 500);
        }
        if (el.descCounter) {
          el.descCounter.textContent = this.value.length;
        }
        if (this.value.trim().length >= 5 && this.value.length <= 500) {
          clearFieldError(el.descTextarea, el.errorDesc);
        }
      });
    }

    // 15. 폼 제출 버튼 클릭
    if (el.submitBtn) {
      el.submitBtn.addEventListener('click', function (e) {
        e.preventDefault();
        submitForm();
      });
    }
  }

  /**
   * 이미지 파일 FileReader 처리 및 미리보기
   */
  function processImageFile(file) {
    const el = initElements();
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('이미지 크기는 10MB 이하만 등록 가능합니다.');
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      currentImageUrl = e.target.result;
      displayImagePreview(currentImageUrl);
      clearFieldError(el.dropzone, el.errorImage);
      if (el.sampleChips) {
        el.sampleChips.forEach(c => c.classList.remove('is-active'));
      }
    };
    reader.readAsDataURL(file);
  }

  /**
   * 샘플 이미지 선택 적용
   */
  function setSampleImage(url, activeChip) {
    const el = initElements();
    currentImageUrl = url;
    displayImagePreview(url);
    clearFieldError(el.dropzone, el.errorImage);

    if (el.fileInput) {
      el.fileInput.value = '';
    }

    if (el.sampleChips) {
      el.sampleChips.forEach(c => c.classList.remove('is-active'));
      if (activeChip) activeChip.classList.add('is-active');
    }
  }

  /**
   * 이미지 미리보기 렌더링
   */
  function displayImagePreview(src) {
    const el = initElements();
    if (el.previewImage && el.previewWrapper && el.dropzonePrompt) {
      el.previewImage.src = src;
      el.previewWrapper.style.display = 'block';
      el.dropzonePrompt.style.display = 'none';
    }
  }

  /**
   * 이미지 초기화
   */
  function clearImage() {
    const el = initElements();
    currentImageUrl = '';
    if (el.fileInput) el.fileInput.value = '';
    if (el.previewImage) el.previewImage.src = '';
    if (el.previewWrapper) el.previewWrapper.style.display = 'none';
    if (el.dropzonePrompt) el.dropzonePrompt.style.display = 'flex';
    if (el.sampleChips) {
      el.sampleChips.forEach(c => c.classList.remove('is-active'));
    }
  }

  function showFieldError(inputEl, errorEl, message) {
    if (inputEl) inputEl.classList.add('is-invalid');
    if (errorEl) {
      if (message) errorEl.textContent = message;
      errorEl.classList.add('visible');
    }
  }

  function clearFieldError(inputEl, errorEl) {
    if (inputEl) inputEl.classList.remove('is-invalid');
    if (errorEl) errorEl.classList.remove('visible');
  }

  function clearAllErrors() {
    document.querySelectorAll('.is-invalid').forEach(node => node.classList.remove('is-invalid'));
    document.querySelectorAll('.gamza-form-error').forEach(node => node.classList.remove('visible'));
  }

  function formatKoreanCurrency(amount) {
    if (amount === 0) return '0원 (무료 나눔 🥔)';
    if (amount >= 100000000) {
      const eok = Math.floor(amount / 100000000);
      const man = Math.floor((amount % 100000000) / 10000);
      return man > 0 ? `${eok}억 ${man.toLocaleString()}만 원` : `${eok}억 원`;
    }
    if (amount >= 10000) {
      const man = Math.floor(amount / 10000);
      const remainder = amount % 10000;
      return remainder > 0 ? `${man.toLocaleString()}만 ${remainder.toLocaleString()}원` : `${man.toLocaleString()}만 원`;
    }
    return `${amount.toLocaleString()}원`;
  }

  /**
   * 폼 유효성 검사 및 객체 생성
   */
  async function submitForm() {
    if (isSubmitting) {
      console.warn('[감자 마켓] 이미 상품 등록이 진행 중입니다.');
      return;
    }

    const el = initElements();
    clearAllErrors();

    let isValid = true;
    let firstInvalidField = null;

    const finalImage = currentImageUrl || DEFAULT_POTATO_IMAGE;

    const titleVal = el.titleInput ? el.titleInput.value.trim() : '';
    if (!titleVal || titleVal.length < 2) {
      showFieldError(el.titleInput, el.errorTitle, '상품명을 2자 이상 입력해주세요.');
      isValid = false;
      if (!firstInvalidField) firstInvalidField = el.titleInput;
    }

    const categoryVal = el.categorySelect ? el.categorySelect.value : '';
    if (!categoryVal) {
      showFieldError(el.categorySelect, el.errorCategory, '카테고리를 선택해주세요.');
      isValid = false;
      if (!firstInvalidField) firstInvalidField = el.categorySelect;
    }

    let priceNum = 0;
    const isFree = el.priceFreeCheck && el.priceFreeCheck.checked;
    if (isFree) {
      priceNum = 0;
    } else {
      const rawPrice = el.priceInput ? el.priceInput.value.replace(/[^0-9]/g, '') : '';
      if (rawPrice === '') {
        showFieldError(el.priceInput, el.errorPrice, '가격을 입력해주세요. (무료 나눔은 체크박스 선택)');
        isValid = false;
        if (!firstInvalidField) firstInvalidField = el.priceInput;
      } else {
        priceNum = parseInt(rawPrice, 10);
      }
    }

    const locationVal = el.locationInput ? el.locationInput.value.trim() : '';
    if (!locationVal || locationVal.length < 2) {
      showFieldError(el.locationInput, el.errorLocation, '거래 희망 동네를 입력해주세요.');
      isValid = false;
      if (!firstInvalidField) firstInvalidField = el.locationInput;
    }

    const statusRadio = document.querySelector('input[name="gamzaProductStatus"]:checked');
    const statusVal = statusRadio ? statusRadio.value : 'selling';
    const statusTextMap = {
      selling: '판매중',
      reserved: '예약중',
      completed: '거래 완료'
    };

    const descVal = el.descTextarea ? el.descTextarea.value.trim() : '';
    if (!descVal || descVal.length < 5) {
      showFieldError(el.descTextarea, el.errorDesc, '자세한 설명을 5자 이상 작성해주세요.');
      isValid = false;
      if (!firstInvalidField) firstInvalidField = el.descTextarea;
    } else if (descVal.length > 500) {
      showFieldError(el.descTextarea, el.errorDesc, '자세한 설명은 최대 500자까지 작성할 수 있습니다.');
      isValid = false;
      if (!firstInvalidField) firstInvalidField = el.descTextarea;
    }

    if (!isValid) {
      if (firstInvalidField) {
        firstInvalidField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalidField.focus();
      }
      return;
    }

    // === 상품 수정 모드인 경우 처리 ===
    if (currentEditingProductId) {
      const editProductData = {
        id: currentEditingProductId,
        title: titleVal,
        category: categoryVal,
        price: priceNum,
        location: locationVal,
        status: statusVal,
        statusText: statusTextMap[statusVal] || '판매중',
        image: finalImage,
        imageUrl: finalImage,
        description: descVal
      };

      console.log('[감자 마켓] 상품 수정 시작:', currentEditingProductId, editProductData);

      isSubmitting = true;
      const originalBtnHtml = el.submitBtn ? el.submitBtn.innerHTML : '';
      if (el.submitBtn) {
        el.submitBtn.disabled = true;
        el.submitBtn.innerHTML = '<span class="gamza-submit-icon">⏳</span><span>감자 수정 중...</span>';
      }

      try {
        let updatedProduct = { ...editProductData };
        if (typeof updateCallback === 'function') {
          const savedProduct = await updateCallback(currentEditingProductId, editProductData);
          if (savedProduct) {
            updatedProduct = { ...updatedProduct, ...savedProduct };
          }
        }

        window.dispatchEvent(
          new CustomEvent('gamza:productUpdate', {
            detail: { product: updatedProduct }
          })
        );

        // 수정 성공 알림 팝업 호출
        showSuccessModal(updatedProduct, true);

        resetWriteForm();
        closeWriteModal();
      } catch (err) {
        console.error('[감자 마켓] 상품 수정 중 오류:', err);
        alert('상품을 수정하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
      } finally {
        isSubmitting = false;
        if (el.submitBtn) {
          el.submitBtn.disabled = false;
          el.submitBtn.innerHTML = originalBtnHtml;
        }
      }
      return;
    }

    // 신규 상품 객체 생성
    const newProduct = {
      title: titleVal,
      category: categoryVal,
      price: priceNum,
      location: locationVal,
      status: statusVal,
      statusText: statusTextMap[statusVal] || '판매중',
      image: finalImage,
      imageUrl: finalImage,
      description: descVal,
      seller: {
        name: '내감자',
        nickname: '내감자',
        temperature: 36.5,
        avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=myPotato'
      },
      likes: 0,
      chats: 0
    };

    console.log('[감자 마켓] 새 상품 등록 시작:', newProduct);

    isSubmitting = true;

    // 저장 중 버튼 상태 처리
    const originalBtnHtml = el.submitBtn ? el.submitBtn.innerHTML : '';
    if (el.submitBtn) {
      el.submitBtn.disabled = true;
      el.submitBtn.innerHTML = '<span class="gamza-submit-icon">⏳</span><span>감자 심는 중...</span>';
    }

    try {
      if (typeof submitCallback === 'function') {
        const savedProduct = await submitCallback(newProduct);
        if (savedProduct) {
          Object.assign(newProduct, savedProduct);
        }
      }

      window.dispatchEvent(
        new CustomEvent('gamza:productSubmit', {
          detail: { product: newProduct }
        })
      );

      // 등록 성공 알림 모달/팝업 호출
      showSuccessModal(newProduct);

      resetWriteForm();
      closeWriteModal();
    } catch (err) {
      console.error('[감자 마켓] 상품 등록 중 오류:', err);
      alert('상품을 등록하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      isSubmitting = false;
      if (el.submitBtn) {
        el.submitBtn.disabled = false;
        el.submitBtn.innerHTML = originalBtnHtml;
      }
    }
  }

  /**
   * 상품 등록/수정 완료 전용 팝업 모달 표시
   */
  function showSuccessModal(product, isEdit = false) {
    let modal = document.getElementById('gamzaSuccessModal');
    
    // 만약 모달 엘리먼트가 없으면 동적으로 DOM에 생성
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'gamzaSuccessModal';
      modal.className = 'gamza-success-modal-overlay';
      modal.innerHTML = `
        <div class="gamza-success-modal-card">
          <div class="gamza-success-header">
            <div class="gamza-success-icon-badge">🥔✨</div>
            <h3 class="gamza-success-title">상품 등록 완료!</h3>
            <p class="gamza-success-subtitle">동네 이웃들에게 내 물건이 공개되었어요.</p>
          </div>
          
          <div class="gamza-success-preview-card">
            <img id="gamzaSuccessImg" src="" alt="상품 썸네일" class="gamza-success-thumb" />
            <div class="gamza-success-info">
              <span id="gamzaSuccessCategory" class="gamza-success-badge">카테고리</span>
              <h4 id="gamzaSuccessTitle" class="gamza-success-prod-title">상품명</h4>
              <div id="gamzaSuccessPrice" class="gamza-success-prod-price">0원</div>
              <div id="gamzaSuccessLoc" class="gamza-success-prod-loc">동네</div>
            </div>
          </div>

          <div class="gamza-success-buttons">
            <button type="button" class="gamza-btn-success-detail" id="gamzaSuccessDetailBtn">
              <span>내가 올린 상품 확인</span>
            </button>
            <button type="button" class="gamza-btn-success-close" id="gamzaSuccessConfirmBtn">
              <span>확인</span>
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
    }

    // 헤더 텍스트 분기 (수정 모드 vs 신규 등록 모드)
    const titleHeaderEl = modal.querySelector('.gamza-success-title');
    const subtitleHeaderEl = modal.querySelector('.gamza-success-subtitle');
    if (titleHeaderEl) {
      titleHeaderEl.textContent = isEdit ? '상품 수정 완료!' : '상품 등록 완료!';
    }
    if (subtitleHeaderEl) {
      subtitleHeaderEl.textContent = isEdit ? '수정된 내용이 이웃들에게 반영되었어요.' : '동네 이웃들에게 내 물건이 공개되었어요.';
    }

    // 데이터 바인딩
    const imgEl = modal.querySelector('#gamzaSuccessImg');
    const catEl = modal.querySelector('#gamzaSuccessCategory');
    const titleEl = modal.querySelector('#gamzaSuccessTitle');
    const priceEl = modal.querySelector('#gamzaSuccessPrice');
    const locEl = modal.querySelector('#gamzaSuccessLoc');
    const detailBtn = modal.querySelector('#gamzaSuccessDetailBtn');
    const confirmBtn = modal.querySelector('#gamzaSuccessConfirmBtn');

    if (imgEl) imgEl.src = product.image || product.imageUrl || DEFAULT_POTATO_IMAGE;
    if (catEl) catEl.textContent = product.category || '기타';
    if (titleEl) titleEl.textContent = product.title || '';
    if (priceEl) {
      priceEl.textContent = product.price === 0 ? '무료 나눔 🥔' : (Number(product.price).toLocaleString('ko-KR') + '원');
    }
    if (locEl) locEl.textContent = product.location || '';

    // 모달 닫기 핸들러
    const closeModal = () => {
      modal.classList.remove('is-active');
      document.body.style.overflow = '';
    };

    // 버튼 이벤트 리스너 바인딩 (이전 리스너 중복 방지를 위해 cloneNode)
    const newDetailBtn = detailBtn.cloneNode(true);
    detailBtn.parentNode.replaceChild(newDetailBtn, detailBtn);
    newDetailBtn.addEventListener('click', () => {
      closeModal();
      if (typeof global.openDetailModal === 'function') {
        global.openDetailModal(product, { isOwner: true });
      }
    });

    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
    newConfirmBtn.addEventListener('click', () => {
      closeModal();
    });

    // 배경 클릭 시 닫기
    modal.onclick = (e) => {
      if (e.target === modal) closeModal();
    };

    // 팝업 표시
    modal.classList.add('is-active');
    document.body.style.overflow = 'hidden';

    // 추가로 하단 가벼운 토스트도 함께 띄워줌
    showSuccessToast(product.title, isEdit);
  }

  function showSuccessToast(productTitle, isEdit = false) {
    const existing = document.getElementById('gamzaToast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'gamzaToast';
    toast.className = 'gamza-toast-notification';
    toast.innerHTML = `
      <span class="gamza-toast-icon">🥔</span>
      <div class="gamza-toast-content">
        <strong>${isEdit ? '수정 완료!' : '등록 완료!'}</strong>
        <span>"${escapeHtml(productTitle)}" 상품이 ${isEdit ? '수정' : '등록'}되었습니다.</span>
      </div>
    `;

    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '30px',
      left: '50%',
      transform: 'translateX(-50%) translateY(20px)',
      backgroundColor: '#1a1c20',
      color: '#FFFFFF',
      padding: '12px 20px',
      borderRadius: '12px',
      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      zIndex: '9999',
      opacity: '0',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      fontSize: '0.9rem'
    });

    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  function handleModalClose() {
    const el = initElements();
    const hasInput = (el.titleInput && el.titleInput.value.trim() !== '') ||
                     (el.descTextarea && el.descTextarea.value.trim() !== '') ||
                     currentImageUrl !== '';

    if (hasInput) {
      if (confirm('작성 중인 내용이 있습니다. 정말 닫으시겠습니까?')) {
        resetWriteForm();
        closeWriteModal();
      }
    } else {
      resetWriteForm();
      closeWriteModal();
    }
  }

  function openWriteModal() {
    const el = initElements();
    if (!el.overlay) return;

    resetWriteForm();
    clearAllErrors();
    el.overlay.classList.add('is-active');
    el.overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      if (el.titleInput) el.titleInput.focus();
    }, 150);
  }

  /**
   * 기존 상품 정보로 폼을 채워 글쓰기 모달을 '수정 모드'로 오픈
   */
  function openWriteModalForEdit(product) {
    if (!product) return;
    const el = initElements();
    if (!el.overlay) return;

    resetWriteForm();
    clearAllErrors();

    currentEditingProductId = product.id;

    if (el.modalTitle) {
      el.modalTitle.textContent = '내 물건 수정하기';
    }
    if (el.submitBtn) {
      el.submitBtn.innerHTML = '<span class="gamza-submit-icon">🥔</span><span>수정 완료</span>';
    }

    if (el.titleInput) {
      el.titleInput.value = product.title || '';
      if (el.titleCounter) el.titleCounter.textContent = String(el.titleInput.value.length);
    }
    if (el.categorySelect) {
      el.categorySelect.value = product.category || '기타';
    }

    if (el.priceInput) {
      const isFree = product.price === 0;
      if (isFree) {
        if (el.priceFreeCheck) el.priceFreeCheck.checked = true;
        el.priceInput.value = '0';
        el.priceInput.disabled = true;
        if (el.pricePreview && el.priceKorean) {
          el.pricePreview.style.display = 'block';
          el.priceKorean.textContent = '0원 (무료 나눔 🥔)';
        }
      } else {
        if (el.priceFreeCheck) el.priceFreeCheck.checked = false;
        el.priceInput.disabled = false;
        const numVal = parseInt(product.price, 10) || 0;
        el.priceInput.value = numVal.toLocaleString('ko-KR');
        if (el.pricePreview && el.priceKorean) {
          el.pricePreview.style.display = 'block';
          el.priceKorean.textContent = formatKoreanCurrency(numVal);
        }
      }
    }

    if (el.locationInput) {
      el.locationInput.value = product.location || '';
    }

    if (el.descTextarea) {
      el.descTextarea.value = product.description || '';
      if (el.descCounter) el.descCounter.textContent = String(el.descTextarea.value.length);
    }

    // 거래 상태 라디오
    const st = product.status || 'selling';
    const targetRadio = document.querySelector(`input[name="gamzaProductStatus"][value="${st}"]`);
    if (targetRadio) {
      targetRadio.checked = true;
    }

    // 이미지
    const img = product.image || product.imageUrl || '';
    if (img) {
      currentImageUrl = img;
      displayImagePreview(img);
    } else {
      clearImage();
    }

    el.overlay.classList.add('is-active');
    el.overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      if (el.titleInput) el.titleInput.focus();
    }, 150);
  }

  function closeWriteModal() {
    const el = initElements();
    if (!el.overlay) return;

    el.overlay.classList.remove('is-active');
    el.overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function resetWriteForm() {
    const el = initElements();
    currentEditingProductId = null;

    if (el.form) el.form.reset();

    clearImage();
    clearAllErrors();

    if (el.modalTitle) {
      el.modalTitle.textContent = '내 물건 팔기';
    }
    if (el.submitBtn) {
      el.submitBtn.innerHTML = '<span class="gamza-submit-icon">🥔</span><span>감자 등록 완료</span>';
    }

    if (el.titleCounter) el.titleCounter.textContent = '0';
    if (el.descCounter) el.descCounter.textContent = '0';
    if (el.pricePreview) el.pricePreview.style.display = 'none';
    if (el.priceInput) el.priceInput.disabled = false;

    const defaultRadio = document.querySelector('input[name="gamzaProductStatus"][value="selling"]');
    if (defaultRadio) defaultRadio.checked = true;

    const scrollable = document.querySelector('.gamza-write-scrollable');
    if (scrollable) scrollable.scrollTop = 0;
  }

  function initWriteModal(options = {}) {
    if (options.onProductSubmit) {
      submitCallback = options.onProductSubmit;
    }
    if (options.onProductUpdate) {
      updateCallback = options.onProductUpdate;
    }
    bindEvents();
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => bindEvents());
  } else {
    bindEvents();
  }

  const GamzaWriteModal = {
    init: initWriteModal,
    open: openWriteModal,
    openForEdit: openWriteModalForEdit,
    close: closeWriteModal,
    reset: resetWriteForm,
    onSubmit: function (callback) {
      submitCallback = callback;
    },
    onUpdate: function (callback) {
      updateCallback = callback;
    }
  };

  global.GamzaWriteModal = GamzaWriteModal;
  global.openWriteModal = openWriteModal;
  global.openWriteModalForEdit = openWriteModalForEdit;
  global.closeWriteModal = closeWriteModal;

})(typeof window !== 'undefined' ? window : this);
